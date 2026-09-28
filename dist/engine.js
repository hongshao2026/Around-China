window.RoadEngine = (() => {
 const R = window.RB;
 const defaults = {departure:'2026-10-01',desert:'town',grassRoute:'town',northXinjiang:'town',highland:'tibet',exit:'main',kanas:false,zhaosu:false,splitIds:[],rests:{},reserve:10,budget:{fuel:10,price:8,hotel:240,food:100,tickets:4000,tolls:2500,service:5000,parking:15,extra:10,buffer:15,power:'fuel',kwh:22,electricity:1.5}};
 function isoDate(start,offset) { const date=new Date(start+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10); }
 function buildPlan(state) {
  const grass = state.grassRoute==='town'?[...R.grass.slice(0,10),...R.grassTown,...R.grass.slice(12)]:R.grass;
  const desertEnd=state.northXinjiang==='town'?[...R.desertEnd.slice(0,4),...R.xinjiangTown,...R.desertEnd.slice(7)]:R.desertEnd;
  const original=[...R.ne,...grass,...(state.desert==='town'?R.townDesert:R.remoteDesert),...desertEnd,...R.xinjiang.filter(d=>!d.optional||state[d.optional]),...(state.highland==='inland'?R.inland:[...R.tibet,...(state.exit==='bing'?R.exitBing:R.exitMain)]),...R.yunnan,...R.guangxi];
  const result=[];
  function append(day,restKey=day.id){
   result.push(day);
   const count=Math.min(30,Math.max(0,Number(state.rests[restKey])||0));
   for(let i=0;i<count;i++)result.push({...day,id:restKey+'r'+i,originalId:day.originalId||day.id,restAnchor:restKey,from:day.to,to:day.to,km:0,h:0,kind:'wait',mid:day.to,see:'留在城镇休息、保养或等候天气；是否放行以当地交警与交通部门信息为准。',note:'你增加的休整日。后续日期已顺延，额外机动预留仍单独保留。',split:null,splitPart:null,via:[],risk:day.remote?'remote':'normal'});
  }
  for(const item of original) {
   const day={...item};
   if(state.splitIds.includes(day.id)&&day.split) {
    const s=day.split;
    append({...day,id:day.id+'a',originalId:day.id,to:s.at,km:s.km,h:s.h,mid:'途中安全停车点',see:'今天只开前半程，抵达后休息。',split:null,splitPart:1,via:[],note:'新增住宿：'+s.at+'镇区有停车位的营业旅馆，出发前确认。原计划：'+day.note});
    const second={...day,id:day.id+'b',originalId:day.id,from:s.at,km:day.km-s.km,h:Math.round((day.h-s.h)*10)/10,mid:'途中安全停车点',split:null,splitPart:2,via:[]};
    // Existing extra nights at the original destination remain attached to that destination.
    append(second,day.id);
    const secondExtras=Math.min(30,Math.max(0,Number(state.rests[second.id])||0));
    for(let i=0;i<secondExtras;i++)result.push({...second,id:second.id+'r'+i,restAnchor:second.id,from:second.to,to:second.to,km:0,h:0,kind:'wait',splitPart:null,see:'留在目的地休息或等候天气。',note:'新增休整日，后续日期已顺延。'});
   } else append(day);
  }
  return result.map((d,index)=>({...d,index:index+1,date:isoDate(state.departure,index)}));
 }
 function totals(plan,state) { const km=plan.reduce((s,d)=>s+d.km,0),h=plan.reduce((s,d)=>s+d.h,0);return {days:plan.length,km,h,rest:plan.filter(d=>['rest','wait'].includes(d.kind)).length,long:plan.filter(d=>d.h>6).length,finish:isoDate(state.departure,plan.length-1),latest:isoDate(state.departure,plan.length+state.reserve-1)}; }
 function hotelFactor(day) {return day.remote?1.15:day.stage==='tibet'?1.25:day.to==='贾登峪'?1.4:1;}
 function budget(plan,state) {
  const p=state.budget,t=totals(plan,state),km=t.km*(1+p.extra/100),days=t.days+state.reserve;
  const energy=km/100*(p.power==='electric'?p.kwh*p.electricity:p.fuel*p.price);
  const lodging=(plan.reduce((sum,d)=>sum+hotelFactor(d),0)+state.reserve)*p.hotel;
  const food=days*p.food,parking=days*p.parking;
  const items=[{name:p.power==='electric'?'充电（仅费用估算）':'燃油',amount:energy,formula:`${Math.round(km).toLocaleString('zh-CN')} km × ${p.power==='electric'?`${p.kwh} kWh/100km × ¥${p.electricity}/kWh`:`${p.fuel} L/100km × ¥${p.price}/L`}`},{name:'住宿',amount:lodging,formula:`${t.days}晚行程＋${state.reserve}晚机动；偏远/高原按系数上浮`},{name:'餐饮',amount:food,formula:`${days}天 × ¥${p.food}/天`},{name:'门票与接驳',amount:p.tickets,formula:'整程预留，可编辑；不代表逐个景区实价'},{name:'通行费',amount:p.tolls,formula:'整程预留；绕行高速后请按实际方案调整'},{name:'停车与杂费',amount:parking,formula:`${days}天 × ¥${p.parking}/天`},{name:'保养与冬季装备',amount:p.service,formula:'整程预留；是否购置冬季胎需按车辆报价调整'}];
  const subtotal=items.reduce((s,i)=>s+i.amount,0),buffer=subtotal*p.buffer/100;
  return {items,subtotal,buffer,total:subtotal+buffer,days,km,lodging,energy};
 }
 return {defaults,buildPlan,totals,budget,isoDate,hotelFactor};
})();
