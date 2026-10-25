// Explicit construction for these two worked examples; never called by preparation.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRuntime } from '../../src/runtime.mjs';

const color = '#283d50';
const text = (x, y, value, size = 20, anchor = 'middle') =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${value}</text>`;
const path = (id, d, attributes = '') =>
  `<path id="${id}" d="${d}" fill="none" stroke="${color}" stroke-width="2" ${attributes}/>`;
const ring = (id, x, y, r, width = 2) => path(id,
  `M ${x-r} ${y} A ${r} ${r} 0 1 0 ${x+r} ${y} A ${r} ${r} 0 1 0 ${x-r} ${y}`,
  `style="stroke-width:${width}"`);
const arrow = (id, x, y, direction, open = false) => {
  const points = direction === 'down' ? [[x-5,y-9],[x,y],[x+5,y-9]]
    : direction === 'up' ? [[x-5,y+9],[x,y],[x+5,y+9]]
    : [[x-9,y-5],[x,y],[x-9,y+5]];
  return `<path id="${id}" d="M ${points.map(p=>p.join(' ')).join(' L ')}${open?'':' Z'}" fill="${open?'none':color}" stroke="${color}" stroke-width="2"/>`;
};
const flow = (id, d, x, y, direction = 'right') => path(id, d) + arrow(`${id}-head`,x,y,direction);
const message = (id,d,x1,y1,x2,y2,direction) =>
  path(id,d,'stroke-dasharray="8 6"')+ring(`${id}-source`,x1,y1,4)+arrow(`${id}-head`,x2,y2,direction,true);
const task = (id,x,y,first,second) => {
  const w=140,h=70,r=12;
  return `<path id="${id}" data-sketch="true" d="M ${x+r} ${y} H ${x+w-r} Q ${x+w} ${y} ${x+w} ${y+r} V ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} H ${x+r} Q ${x} ${y+h} ${x} ${y+h-r} V ${y+r} Q ${x} ${y} ${x+r} ${y} Z" fill="#e7f0fa" stroke="${color}" stroke-width="2"/>`+
    text(x+70,y+(second?29:42),first)+ (second?text(x+70,y+53,second):'');
};
const gateway = (id,x,y) => path(id,`M ${x-30} ${y} L ${x} ${y-30} L ${x+30} ${y} L ${x} ${y+30} Z`)+
  path(`${id}-exclusive`, `M ${x-10} ${y-10} L ${x+10} ${y+10} M ${x+10} ${y-10} L ${x-10} ${y+10}`);
const start = () => ring('message-start',280,280,20)+
  path('message-envelope','M 269 273 H 291 V 287 H 269 Z M 269 273 L 280 281 L 291 273')+text(280,325,'Request',16);
const end = (id,x,y,label) => ring(id,x,y,18,4)+text(x,y+42,label,16);
const shell = (participant,laneA,laneB,external) => [
  `<rect id="external-pool" data-sketch="true" x="20" y="30" width="1120" height="65" fill="#ffffff" stroke="${color}" stroke-width="2"/>`,
  text(580,72,external),
  `<rect id="process-pool" data-sketch="true" x="20" y="190" width="1120" height="380" fill="#ffffff" stroke="${color}" stroke-width="2"/>`,
  path('pool-header','M 130 190 V 570','data-sketch="true"'),
  path('lane-header','M 240 190 V 570','data-sketch="true"'),
  path('lane-divider','M 130 380 H 1140','data-sketch="true"'),
  text(75,384,participant,16),text(185,286,laneA,15),text(185,476,laneB,15)
];
const legend = () => [text(25,620,'Solid + filled arrow = sequence flow inside a pool.',18,'start'),
  text(25,652,'Dashed + open arrow = message flow between participants.',18,'start')];
const wrap = (title,description,parts) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1160 685"><title>${title}</title><desc>${description}</desc>\n${parts.join('\n')}\n</svg>\n`;

const cases = [
 { id:'fig-bpmn-order', title:'BPMN order fulfilment with a stock decision',
 description:'A Customer black-box pool sends an order to a Merchant message start event. Sales checks stock. An exclusive gateway sends unavailable orders to Decline order and an end event, or available orders across the Warehouse lane to Pack order, Ship order and a separate end event. Ship order sends a dispatch message to Customer.',
 parts:[...shell('Merchant','Sales','Warehouse','Customer (black-box participant)'),
 message('order-message','M 280 99 V 260',280,99,280,260,'down'),text(338,145,'Order',17),
 message('dispatch-message','M 960 431 V 145 H 1080 V 95',960,431,1080,95,'up'),text(930,130,'Dispatch notice',17),
 flow('start-to-check','M 300 280 H 350',350,280),
 flow('check-to-gateway','M 490 280 H 550',550,280),
 flow('out-of-stock','M 610 280 H 740',740,280),text(660,263,'No',18),
 flow('declined','M 880 280 H 1002',1002,280),
 flow('in-stock','M 580 310 V 470 H 680',680,470),text(607,350,'Yes',18),
 flow('packed','M 820 470 H 890',890,470),flow('shipped','M 1030 470 H 1062',1062,470),
 start(),task('check-stock',350,245,'Check stock'),gateway('stock-choice',580,280),text(580,225,'In stock?',18),
 task('decline-order',740,245,'Decline','order'),end('decline-end',1020,280,'Declined'),
 task('pack-order',680,435,'Pack order'),task('ship-order',890,435,'Ship order'),end('ship-end',1080,470,'Shipped'),...legend()]
 },
 {id:'fig-bpmn-support',title:'BPMN support escalation with an exclusive merge',
 description:'A Requester black-box pool sends an issue to a Service message start event. Support triages it. A Known fix exclusive gateway routes Yes directly to an exclusive merge, or No through Engineering investigation before merging. Support replies, sends a message to Requester and reaches a normal end event. No parallel split or retry is shown.',
 parts:[...shell('Service','Support','Engineering','Requester (black-box participant)'),
 message('issue-message','M 280 99 V 260',280,99,280,260,'down'),text(338,145,'Issue',17),
 message('reply-message','M 1000 241 V 145 H 1080 V 95',1000,241,1080,95,'up'),text(930,130,'Reply',17),
 flow('start-to-triage','M 300 280 H 350',350,280),flow('triage-to-choice','M 490 280 H 550',550,280),
 flow('known-fix','M 610 280 H 820',820,280),text(705,263,'Yes',18),
 flow('needs-investigation','M 580 310 V 470 H 680',680,470),text(607,350,'No',18),
 flow('investigated','M 820 470 H 850 V 310',850,310,'up'),
 flow('merged','M 880 280 H 930',930,280),flow('replied','M 1070 280 H 1087',1087,280),
 start(),task('triage',350,245,'Triage issue'),gateway('known-choice',580,280),text(580,225,'Known fix?',18),
 task('investigate',680,435,'Investigate'),gateway('exclusive-merge',850,280),
 task('reply',930,245,'Reply'),end('reply-end',1105,280,'Replied'),...legend()]
 }
];

const runtime = await createRuntime();
try {
 for (const scenario of cases) {
  const directory=new URL(`assets/${scenario.id}/`,import.meta.url);
  await mkdir(directory,{recursive:true});
  const exact=wrap(scenario.title,scenario.description,scenario.parts);
  let source=exact;
  const sketch=scenario.id==='fig-bpmn-support';
  if(sketch) {
   const draw=()=>runtime.page.evaluate(({source})=>{
    const document=new DOMParser().parseFromString(source,'image/svg+xml');
    const svg=document.documentElement;
    const renderer=rough.svg(svg);
    let seed=1729;
    for(const node of [...svg.querySelectorAll('[data-sketch]')]) {
     const options={seed:seed++,roughness:1.8,bowing:1,preserveVertices:true,
       stroke:node.getAttribute('stroke'),strokeWidth:Number(node.getAttribute('stroke-width'))};
     const group=document.createElementNS(svg.namespaceURI,'g');
     group.setAttribute('data-sketch-role',node.id);
     const fill=node.cloneNode(true);fill.setAttribute('stroke','none');group.append(fill);
     const contour=node.localName==='rect'?renderer.rectangle(Number(node.getAttribute('x')),
       Number(node.getAttribute('y')),Number(node.getAttribute('width')),Number(node.getAttribute('height')),options)
       :renderer.path(node.getAttribute('d'),options);
     group.append(contour);node.replaceWith(group);
    }
    return new XMLSerializer().serializeToString(svg)+'\n';
   },{source:exact});
   source=await draw();assert.equal(await draw(),source,'Sketch construction must repeat exactly.');
  }
  await writeFile(new URL('base.svg',directory),exact);
  if(sketch) await writeFile(new URL('sketch.svg',directory),source);
  // Sidecars are authored separately; this command only rebuilds drawing source.
 }
} finally {await runtime.browser.close();}
export const scenarios=cases.map(({id,title,description})=>({id,title,description}));
