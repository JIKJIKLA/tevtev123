const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('goal spectacle is bounded, uses scorer paint and cleans up on the next state',()=>{
 const {api:a,document:d}=load();a.configureCars();a.setState({st:'GOAL',score:[1,0]});a.cars[0].color=0xa834c7;
 assert.equal(a.triggerCelebration({id:1,team:0,scorer:0,speed:72}),true);assert.equal(a.CELEBRATION.color,0xa834c7);assert.equal(d.getElementById('goal-spectacle').hidden,false);assert.equal(a.triggerCelebration({id:1,team:0,scorer:0,speed:72}),false);
 a.updateCelebrations(3);assert.equal(d.getElementById('goal-spectacle').hidden,true);a.clearCelebration();assert.equal(a.CELEBRATION.age,99);assert.equal(d.body.classList.contains('goal-impact'),false);
 for(const age of [-1,0,.05,.3,1,2.8,9])assert.ok(a.celebrationEnvelope(age)>=0&&a.celebrationEnvelope(age)<=1);assert.equal(a.celebrationEnvelope(3),0);
});
test('reduced motion keeps a readable goal message without impact animation',()=>{
 const {api:a,document:d,window:w}=load();w.matchMedia=()=>({matches:true});a.setState({st:'GOAL',score:[0,1]});assert.equal(a.triggerCelebration({id:2,team:1,scorer:1,speed:30}),true);assert.equal(d.getElementById('goal-spectacle').hidden,false);assert.equal(d.body.classList.contains('goal-impact'),false);a.updateCelebrations(2);assert.equal(d.getElementById('goal-spectacle').hidden,true);assert.equal(a.triggerCelebration({team:4}),false);
});

test('dark paint retains the car finish while keeping celebration accents readable',()=>{const {api:a}=load();a.setState({st:'GOAL',score:[1,0]});a.cars[0].color=0;assert.equal(a.triggerCelebration({id:9,team:0,scorer:0,speed:50}),true);assert.notEqual(a.CELEBRATION.color,0);assert.equal(a.cars[0].color,0);});
