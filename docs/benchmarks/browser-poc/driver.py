"""Pinned upstream drivers. Control and credentials arrive through private pipes."""
import asyncio
import json
import os
from pathlib import Path
import signal
import shutil
import sys
import tempfile
import time

OUT = os.fdopen(3, 'w', buffering=1)
CONFIG = json.loads(sys.stdin.readline())
METRICS = []
SECRETS = [CONFIG['openrouterKey'], CONFIG['jevKey']]


def clean(value):
    text = str(value)
    for secret in SECRETS:
        text = text.replace(secret, '[redacted]')
    return text[:2500]


def emit(kind, **data):
    OUT.write(json.dumps({'kind': kind, **data}, default=str) + '\n')


def metric(provider, elapsed, body=None, error=None):
    body = body or {}
    usage = body.get('usage') or {}
    row = dict(provider=provider, elapsedMs=elapsed * 1000, usage=usage,
               model=body.get('model'), upstream=body.get('provider'), error=error)
    METRICS.append(row)
    emit('metric', **row)


def interrupted(*_):
    raise KeyboardInterrupt('stopped')


signal.signal(signal.SIGTERM, interrupted)
RUNTIME_DIR = tempfile.mkdtemp(prefix='bhp-')
os.environ.update(ANONYMIZED_TELEMETRY='false', BROWSER_USE_LOGGING_LEVEL='error',
                  BH_HOME=CONFIG['workDir'] + '/harness', BU_NAME='poc',
                  BH_RUNTIME_DIR=RUNTIME_DIR,
                  BU_CDP_URL=CONFIG['cdpUrl'], BH_UPDATE_CHECK='0', BH_TAB_MARKER='0')


def ultrafast():
    from browser_harness.admin import ensure_daemon, restart_daemon
    from browser_harness.helpers import cdp
    from browser_harness import _ipc
    # Launch the isolated transport daemon BEFORE placing model keys in this process environment.
    ensure_daemon(wait=15)
    try:
        pid_path = _ipc.pid_path('poc')
        if Path(pid_path).exists():
            emit('owned_daemon', path=str(pid_path))
        os.environ.update(TYPESAFE_API_KEY=CONFIG['jevKey'], TYPESAFE_MODEL='jev-1.13.0',
                          TEXT_MODEL_API_KEY=CONFIG['openrouterKey'],
                          TEXT_MODEL_BASE_URL='https://openrouter.ai/api/v1',
                          TEXT_MODEL=CONFIG['model'], TEXT_MODEL_REASONING='low')
        from jev_ultrafast import agent as agent_module, model
        from jev_ultrafast.browser import Browser

        class PreparedBrowser(Browser):
            # Only replace browser creation: common runner already prepared the same owned tab.
            # Upstream observe/fresh/act and its native CDP transport are unchanged.
            def __init__(self, url):
                targets = cdp('Target.getTargets')['targetInfos']
                pages = [t for t in targets if t['type'] == 'page' and t['url'] == url]
                if len(pages) != 1:
                    raise RuntimeError('Expected exactly one prepared task tab')
                self.target = pages[0]['targetId']
                self.session = cdp('Target.attachToTarget', targetId=self.target, flatten=True)['sessionId']
                self.call('Emulation.setFocusEmulationEnabled', enabled=True)

            def close(self):
                # The runner owns the tab and needs it for independent verification.
                pass

        agent_module.Browser = PreparedBrowser
        original_post = model.post_json

        def measured_post(url, key, body):
            provider = 'jev' if 'typesafe.ai' in url else 'openrouter'
            if provider == 'openrouter':
                body = {**body, 'provider': {'only': ['google-ai-studio'], 'allow_fallbacks': False,
                                            'require_parameters': True}}
            started = time.perf_counter()
            try:
                result = original_post(url, key, body)
            except Exception as exc:
                metric(provider, time.perf_counter() - started, error=clean(exc))
                raise
            metric(provider, time.perf_counter() - started, result)
            return result

        model.post_json = measured_post
        agent = agent_module.Agent(CONFIG['url'], CONFIG['goal'])
        emit('ready')
        if sys.stdin.readline().strip() != 'go':
            return
        started = time.perf_counter()
        error = None
        try:
            while agent.state['status'] not in {'done', 'blocked'}:
                if time.perf_counter() - started > CONFIG['timeoutMs'] / 1000:
                    raise TimeoutError('task deadline')
                agent.command('tick')
                emit('step', status=agent.state['status'], actions=len(agent.state['history']),
                     decisions=len(agent.state['decisions']))
        except (Exception, KeyboardInterrupt) as exc:
            error = clean(exc)
        emit('result', state=agent.state['status'], completed=agent.state['status'] == 'done' and not error,
             error=error, actions=len(agent.state['history']), history=agent.state['history'],
             decisions=agent.state['decisions'], textCalls=agent.state['text_calls'])
    finally:
        # Parent owns browser lifecycle; only stop this dedicated transport daemon.
        restart_daemon('poc')


async def browser_use():
    import httpx
    from browser_use import Agent, Browser
    from browser_use.tools.service import Tools
    from browser_use.llm.openrouter.chat import ChatOpenRouter

    async def on_request(request):
        request.extensions['poc_start'] = time.perf_counter()

    async def on_response(response):
        await response.aread()
        elapsed = time.perf_counter() - response.request.extensions['poc_start']
        try:
            body = response.json()
        except ValueError:
            body = {}
        metric('openrouter', elapsed, body,
               error=f'HTTP {response.status_code}' if response.is_error else None)

    client = httpx.AsyncClient(http2=True, timeout=60,
                              event_hooks={'request': [on_request], 'response': [on_response]})
    llm = ChatOpenRouter(model=CONFIG['model'], api_key=CONFIG['openrouterKey'], max_retries=1,
                         http_client=client, extra_body={'reasoning': {'effort': 'low'}, 'max_tokens': 4096,
                         'provider': {'only': ['google-ai-studio'], 'allow_fallbacks': False,
                                      'require_parameters': True}})
    browser = Browser(cdp_url=CONFIG['cdpUrl'], keep_alive=True, enable_default_extensions=False,
                      allowed_domains=CONFIG['domains'], highlight_elements=False)
    tools = Tools(exclude_actions=['search', 'evaluate', 'upload_file', 'write_file', 'replace_file',
                                  'read_file', 'save_as_pdf'])
    agent = Agent(task=CONFIG['goal'], llm=llm, browser=browser, tools=tools,
                  use_vision='auto', flash_mode=CONFIG['category'] != 'reasoning',
                  max_actions_per_step=5, max_failures=3, use_judge=False,
                  directly_open_url=False, enable_signal_handler=False,
                  file_system_path=CONFIG['workDir'] + '/files',
                  save_conversation_path=CONFIG['workDir'] + '/conversation',
                  llm_timeout=65, step_timeout=80,
                  extend_system_message=CONFIG['rules'])
    await browser.start()
    await browser.get_browser_state_summary()
    emit('ready')
    if await asyncio.to_thread(sys.stdin.readline) != 'go\n':
        return
    error = None
    try:
        history = await asyncio.wait_for(agent.run(max_steps=60), CONFIG['timeoutMs'] / 1000)
    except (Exception, KeyboardInterrupt) as exc:
        error = clean(exc)
        history = agent.history
    trace = [{'actions': h.model_output.model_dump(mode='json') if h.model_output else None,
              'results': [r.model_dump(mode='json') for r in h.result]} for h in history.history]
    emit('result', state='done' if history.is_done() else 'stopped',
         completed=history.is_done() and history.is_successful() is True and not error,
         error=error, actions=sum(len(h.model_output.action) if h.model_output else 0 for h in history.history),
         final=history.final_result(), history=trace, errors=history.errors())
    await browser.stop()
    await client.aclose()


try:
    if CONFIG['engine'] == 'ultrafast':
        ultrafast()
    else:
        asyncio.run(browser_use())
except (Exception, KeyboardInterrupt) as exc:
    emit('fatal', error=clean(exc))
    sys.exit(1)
finally:
    shutil.rmtree(RUNTIME_DIR, ignore_errors=True)
