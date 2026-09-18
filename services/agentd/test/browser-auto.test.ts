import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BUDGETS, type BrowserObservation } from "@law/protocol";
import { BrowserBatch, progressFingerprint, runBrowserBatch } from "../src/orchestrator/browser-auto.js";
import { runBrowserTask, type BrowserDriverContext } from "../src/orchestrator/jev-browser.js";
import { RunController } from "../src/orchestrator/run-controller.js";
import { Store } from "../src/storage/store.js";
import { FakeModelAdapter } from "../src/provider/fake.js";
import { BrowserActionPolicy } from "../src/policy/browser-policy.js";
import type { TerminalWorker } from "../src/worker/types.js";
import type { JevReply } from "../src/provider/jev.js";

const obs = (): BrowserObservation => ({revision:1,activePageId:"p1",url:"https://example.com",title:"Form",pageText:"Contact form",viewport:{width:1000,height:700},scroll:{x:0,y:0,maxY:0},pages:[],elements:[
  {ref:"e1",nodeId:"doc:1",role:"textbox",name:"Name",value:"",editable:true,enabled:true,inViewport:true,operations:["type"],bounds:{x:0,y:0,width:100,height:30}},
  {ref:"e2",nodeId:"doc:2",role:"button",name:"Preview",editable:false,enabled:true,inViewport:true,operations:["click"],bounds:{x:0,y:40,width:100,height:30}},
]});
const batch = {reason:"Fill and preview",actions:[{kind:"type",ref:"e1",revision:1,text:"Ada"},{kind:"click",ref:"e2",revision:1}]};
function setup() {
  let state=obs();const stop=new AbortController();let current=true;
  const execute=vi.fn(async (call: {name:string;args:any}) => {
    if(call.name==="browser_observe") state={...state,revision:state.revision+1,elements:state.elements.map(e=>({...e}))};
    if(call.name==="browser_act" && call.args.action.kind==="type") state.elements[0]!.value=call.args.action.text;
    return {output:call.name==="browser_act"?"{}":"fresh evidence"};
  });
  const ctx:BrowserDriverContext={execute,observation:()=>state,current:()=>current&&!stop.signal.aborted,signal:stop.signal,event:vi.fn(),record:vi.fn(),beforeDecision:async()=>current};
  return {ctx,execute,stop,get state(){return state;},change:(fn:(s:BrowserObservation)=>void)=>fn(state),takeover:()=>{current=false;}};
}
describe("Auto batch contracts",()=>{
  it("groups independent field edits with one final click, refreshing refs and revisions",async()=>{
    const t=setup();const result=await runBrowserBatch(batch,t.ctx);
    expect(result).toMatchObject({actions:2,status:"completion_candidate",verified:false});
    expect(t.execute.mock.calls.filter(([c])=>c.name==="browser_act").map(([c])=>c.args.action)).toEqual([
      {kind:"type",ref:"e1",revision:2,text:"Ada"},{kind:"click",ref:"e2",revision:3},
    ]);
  });
  it.each(["replaced","label","value","context","new_control"])("stops before mutation after %s changed",async change=>{
    const t=setup();const original=t.execute.getMockImplementation()!;
    t.execute.mockImplementation(async c=>{const r=await original(c);if(c.name==="browser_observe"){
      if(change==="replaced")t.state.elements[0]!.nodeId="other-node";
      if(change==="label")t.state.elements[1]!.name="Purchase";
      if(change==="value")t.state.elements[0]!.value="human input";
      if(change==="context")t.state.pageText="Different order, different price";
      if(change==="new_control")t.state.elements.push({...t.state.elements[1]!,ref:"e3",nodeId:"new"});
    }return r;});
    expect((await runBrowserBatch(batch,t.ctx)).status).toBe("needs_help");
    expect(t.execute.mock.calls.filter(([c])=>c.name==="browser_act")).toHaveLength(0);
  });
  it("does not replay a partially failed mutation or execute later actions",async()=>{
    const t=setup();const original=t.execute.getMockImplementation()!;
    t.execute.mockImplementation(async c=>c.name==="browser_act"?{output:JSON.stringify({error:{code:"TIMEOUT"}})}:original(c));
    const result=await runBrowserBatch(batch,t.ctx);expect(result).toMatchObject({actions:0,status:"needs_help"});
    expect(t.execute.mock.calls.filter(([c])=>c.name==="browser_act")).toHaveLength(1);
  });
  it("checks the expected effect of a previous fill instead of blindly continuing",async()=>{
    const t=setup();const original=t.execute.getMockImplementation()!;
    t.execute.mockImplementation(async c=>c.name==="browser_act"?{output:"{}"}:original(c));
    expect(await runBrowserBatch(batch,t.ctx)).toMatchObject({actions:1,status:"needs_help"});
    expect(t.execute.mock.calls.filter(([c])=>c.name==="browser_act")).toHaveLength(1);
  });
  it.each(["stop","takeover"])("%s between edits prevents subsequent actions",async which=>{
    const t=setup();const original=t.execute.getMockImplementation()!;
    t.execute.mockImplementation(async c=>{const r=await original(c);if(c.name==="browser_act"){if(which==="stop")t.stop.abort();else t.takeover();}return r;});
    await runBrowserBatch(batch,t.ctx);
    expect(t.execute.mock.calls.filter(([c])=>c.name==="browser_act")).toHaveLength(1);
    expect(t.execute.mock.calls.at(-1)![0].name).toBe("browser_act");
  });
  it("refuses a transition before the end, duplicate writes, and sensitive fields",async()=>{
    const t=setup();
    expect((await runBrowserBatch({...batch,actions:[batch.actions[1],batch.actions[0]]},t.ctx)).reason).toBe("transition_must_be_last");
    expect((await runBrowserBatch({...batch,actions:[{...batch.actions[0],revision:t.state.revision},{...batch.actions[0],revision:t.state.revision}]},t.ctx)).reason).toContain("duplicate_target");
    t.state.elements[0]!.sensitive=true;
    expect((await runBrowserBatch({...batch,actions:[{...batch.actions[0],revision:t.state.revision}]},t.ctx)).reason).toContain("sensitive_field");
    expect(t.execute.mock.calls.some(([c])=>c.name==="browser_act")).toBe(false);
  });
  it("rejects arbitrary code and more than eight actions",()=>{
    expect(BrowserBatch.safeParse({reason:"x",actions:[{kind:"eval",code:"alert(1)"}]}).success).toBe(false);
    expect(BrowserBatch.safeParse({reason:"x",actions:Array(9).fill({kind:"wait",ms:1})}).success).toBe(false);
  });
});

it("detects cycles despite revisions, refs, node replacement or geometry changes",async()=>{
  const a=obs(),b=obs();b.revision=999;b.elements[0]!.ref="e99";b.elements[0]!.nodeId="replacement";b.elements[0]!.bounds.x=300;
  expect(progressFingerprint(a)).toBe(progressFingerprint(b));b.pageText="other state";expect(progressFingerprint(a)).not.toBe(progressFingerprint(b));
  const t=setup();let decisions=0;
  const evaluator={evaluate:async()=>{decisions++;t.change(s=>{s.revision++;});return {model:"jev-test",elapsedMs:1,costUsd:0,usage:{input_tokens:1,output_tokens:1},answers:{operation:{type:"choice",choice:"CLICK",confidence:1,probabilities:{CLICK:1}},click:{type:"choice",choice:"e2",confidence:1,probabilities:{e2:1}}}} as JevReply;}};
  const result=await runBrowserTask({goal:"Open preview"},evaluator,t.ctx,.55,true,true);
  expect(result.reason).toContain("no_progress_cycle");expect(decisions).toBe(2);
});

const stores:Store[]=[];afterEach(()=>stores.splice(0).forEach(s=>s.close()));
it("Auto journals routing and enforces approval for each batch child",async()=>{
  const t=setup();t.state.elements[1]!.name="Purchase";
  const approvals={isSessionAllowed:()=>false,request:vi.fn(async()=>"deny" as const)};
  const store=new Store(":memory:");stores.push(store);
  const adapter=new FakeModelAdapter([{toolCalls:[{name:"browser_batch",args:batch}]},{text:"Denied"}]);
  const rc=new RunController({store,adapter,worker:{cancel(){}} as TerminalWorker,
    tools:{specs:[],execute:t.execute},policy:new BrowserActionPolicy({lastObservation:()=>t.state,approvals}),
    budgets:DEFAULT_BUDGETS,hybrid:{strategy:"auto",evaluator:{evaluate:vi.fn()},observation:()=>t.state,minConfidence:.55}},
    {workspaceId:store.createWorkspace("/tmp/auto-test"),goal:"Preview",networkMode:"open"});
  await rc.start();expect(approvals.request).toHaveBeenCalledOnce();
  expect(t.execute.mock.calls.filter(([c])=>c.name==="browser_act")).toHaveLength(1); // fill only
  expect(store.listEvents(rc.runId).find(e=>e.type==="browser.route")?.payload).toMatchObject({mode:"planned",tool:"browser_batch"});
  expect(adapter.contexts[0]!.tools.map(t=>t.name)).toContain("browser_batch");
  expect(adapter.contexts[0]!.tools.map(t=>t.name)).not.toContain("browser_act");
});

it("Auto Stop cancels a pending decision and never executes its result",async()=>{
  const t=setup();const store=new Store(":memory:");stores.push(store);
  let entered!:()=>void;const started=new Promise<void>(r=>entered=r);
  const rc=new RunController({store,adapter:new FakeModelAdapter([{toolCalls:[{name:"browser_task",args:{goal:"Open preview"}}]}]),
    worker:{cancel(){}} as TerminalWorker,tools:{specs:[],execute:t.execute},
    hybrid:{strategy:"auto",observation:()=>t.state,minConfidence:.55,evaluator:{evaluate:async(_r,signal)=>{entered();return new Promise((_resolve,reject)=>signal.addEventListener("abort",()=>reject(Error("stopped")),{once:true}));}}}},
    {workspaceId:store.createWorkspace("/tmp/auto-stop"),goal:"Preview",networkMode:"open"});
  const run=rc.start();await started;rc.stop();expect((await run).state).toBe("stopped");
  expect(t.execute.mock.calls.map(([c])=>c.name)).toEqual(["browser_observe"]);
});

it("Auto returns no progress to the same planner and journals the change of executor",async()=>{
  const t=setup(),store=new Store(":memory:");stores.push(store);
  const adapter=new FakeModelAdapter([{toolCalls:[{name:"browser_task",args:{goal:"Open preview"}}]},
    {toolCalls:[{name:"browser_batch",args:{reason:"Inspect and replan after no progress",actions:[]}}]},{text:"Inspected"}]);
  const rc=new RunController({store,adapter,worker:{cancel(){}} as TerminalWorker,tools:{specs:[],execute:t.execute},
    hybrid:{strategy:"auto",observation:()=>t.state,minConfidence:.55,evaluator:{evaluate:async()=>({model:"jev",elapsedMs:1,costUsd:0,usage:{input_tokens:1,output_tokens:1},answers:{operation:{type:"choice",choice:"CLICK",confidence:1,probabilities:{CLICK:1}},click:{type:"choice",choice:"e2",confidence:1,probabilities:{e2:1}}}})}}},
    {workspaceId:store.createWorkspace("/tmp/auto-switch"),goal:"Preview",networkMode:"open"});
  await rc.start();expect(JSON.stringify(adapter.inputs[1])).toContain("no_progress_cycle");
  expect(store.listEvents(rc.runId).filter(e=>e.type==="browser.route").map(e=>e.payload)).toMatchObject([{mode:"fast",switched:false},{mode:"planned",previous:"fast",switched:true}]);
});
