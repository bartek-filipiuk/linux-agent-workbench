# Linux Agent Workbench terminal image.
if [ -n "$PS1" ]; then
  PS1='\[\e[1;34m\]agent@law\[\e[0m\]:\[\e[1;36m\]\w\[\e[0m\]\$ '
  export HISTFILE=/tmp/.bash_history
  # Policy gate: every simple command of this interactive shell is checked by agentd before it runs.
  # extdebug is enabled from the first prompt, not from this startup file: set during startup, bash
  # tries to load the bashdb debugger and, failing that, disables debugging mode (the DEBUG trap's
  # non-zero return would then no longer skip the command).
  # Ceiling: bash -c, scripts, other shells and nested agents' own processes are not covered; the
  # container, mounts and network profile are the boundary for those.
  if [ -S /run/law/gate.sock ]; then
    __law_gate() {
      case "$BASH_COMMAND" in
        __law_*|"shopt -s extdebug"|"trap "*|PROMPT_COMMAND=*) return 0 ;;
      esac
      /opt/law/gate "$BASH_COMMAND" || return 1
    }
    __law_arm() { shopt -s extdebug; trap '__law_gate' DEBUG; PROMPT_COMMAND="${PROMPT_COMMAND#__law_arm;}"; }
    PROMPT_COMMAND="__law_arm;${PROMPT_COMMAND}"
  fi
fi
