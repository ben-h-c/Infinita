import * as THREE from 'three';
import { solveKepler } from './physics.js';

const COMET_DATA=[
  {name:'Halley',  a:17.8,  e:0.967, T:75.3,  t0:-36.5, inc:162, node:59,  w:112},
  {name:'Bopp',    a:186,   e:0.995, T:2520,  t0:0.7,   inc:89,  node:283, w:130}
];

function _cometPos(cd,yr){
  const n=2*Math.PI/cd.T;
  const M=((n*(yr-cd.t0))%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
  const E=solveKepler(M,cd.e);
  const x=cd.a*(Math.cos(E)-cd.e),y=cd.a*Math.sqrt(1-cd.e*cd.e)*Math.sin(E);
  const inc=cd.inc*Math.PI/180,node=cd.node*Math.PI/180,w=cd.w*Math.PI/180;
  const cN=Math.cos(node),sN=Math.sin(node),cI=Math.cos(inc),sI=Math.sin(inc),cW=Math.cos(w),sW=Math.sin(w);
  const xp=x*cW-y*sW,yp=x*sW+y*cW;
  return new THREE.Vector3(xp*cN-yp*sN*cI, yp*sI, xp*sN+yp*cN*cI);
}

const _cometObjs=[];

export function initComets(scene){
  COMET_DATA.forEach(cd=>{
    // Nucleus
    const nMesh=new THREE.Mesh(new THREE.SphereGeometry(0.012,8,8),new THREE.MeshStandardMaterial({color:0x888877,roughness:0.95,metalness:0.05}));
    // Coma sprite
    const cc=document.createElement('canvas'); cc.width=64; cc.height=64;
    const cctx=cc.getContext('2d'),cg=cctx.createRadialGradient(32,32,0,32,32,32);
    cg.addColorStop(0,'rgba(200,220,255,0.85)'); cg.addColorStop(0.3,'rgba(150,185,255,0.38)'); cg.addColorStop(1,'rgba(100,150,255,0)');
    cctx.fillStyle=cg; cctx.fillRect(0,0,64,64);
    const coma=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cc),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));
    coma.scale.setScalar(0.18);
    // Dust tail (30 strands, yellowish fan)
    const DS=30,dtP=new Float32Array(DS*6),dtC=new Float32Array(DS*6);
    const _spread=Array.from({length:DS},()=>[(Math.random()-0.5)*0.18,(Math.random()-0.5)*0.10,0.5+Math.random()*0.55]);
    const dGeo=new THREE.BufferGeometry();
    dGeo.setAttribute('position',new THREE.BufferAttribute(dtP,3));
    dGeo.setAttribute('color',new THREE.BufferAttribute(dtC,3));
    const dTail=new THREE.LineSegments(dGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.7,blending:THREE.AdditiveBlending,depthWrite:false}));
    // Ion tail (20 segments, blue)
    const IS=20,itP=new Float32Array(IS*6),itC=new Float32Array(IS*6);
    const iGeo=new THREE.BufferGeometry();
    iGeo.setAttribute('position',new THREE.BufferAttribute(itP,3));
    iGeo.setAttribute('color',new THREE.BufferAttribute(itC,3));
    const iTail=new THREE.LineSegments(iGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending,depthWrite:false}));
    const grp=new THREE.Group();
    grp.add(nMesh,coma,dTail,iTail); scene.add(grp);
    _cometObjs.push({cd,grp,nMesh,coma,dTail,iTail,dtP,dtC,itP,itC,_spread});
  });
}

export function updateComets(dt,simTime,currentScale){
  if(currentScale>0){ _cometObjs.forEach(o=>o.grp.visible=false); return; }
  _cometObjs.forEach(co=>{
    const pos=_cometPos(co.cd,simTime);
    const dist=pos.length();
    const vis=dist<28;
    co.grp.visible=vis; if(!vis) return;
    co.grp.position.copy(pos);
    const tDir=pos.clone().normalize(); // anti-solar direction
    const tLen=Math.min(7,2.0/(dist*0.28+0.08));
    const tAlpha=Math.min(1,1.8/dist);
    // Dust tail strands
    const DS=co._spread.length;
    for(let i=0;i<DS;i++){
      const [sx,sy,sf]=co._spread[i];
      co.dtP[i*6]=co.dtP[i*6+1]=co.dtP[i*6+2]=0;
      co.dtP[i*6+3]=tDir.x*tLen*sf+sx*tLen*0.35;
      co.dtP[i*6+4]=tDir.y*tLen*sf+sy*tLen*0.35;
      co.dtP[i*6+5]=tDir.z*tLen*sf;
      co.dtC[i*6]=0.92;co.dtC[i*6+1]=0.82;co.dtC[i*6+2]=0.48;
      co.dtC[i*6+3]=co.dtC[i*6+4]=co.dtC[i*6+5]=0;
    }
    co.dTail.geometry.attributes.position.needsUpdate=true;
    co.dTail.geometry.attributes.color.needsUpdate=true;
    co.dTail.material.opacity=tAlpha*0.65;
    // Ion tail segments
    const IS=20,iL=tLen*0.75;
    for(let i=0;i<IS;i++){
      const f0=i/IS,f1=(i+1)/IS;
      co.itP[i*6+0]=tDir.x*iL*f0; co.itP[i*6+1]=tDir.y*iL*f0; co.itP[i*6+2]=tDir.z*iL*f0;
      co.itP[i*6+3]=tDir.x*iL*f1; co.itP[i*6+4]=tDir.y*iL*f1; co.itP[i*6+5]=tDir.z*iL*f1;
      const b0=1-f0,b1=1-f1;
      co.itC[i*6+0]=0.45*b0;co.itC[i*6+1]=0.68*b0;co.itC[i*6+2]=b0;
      co.itC[i*6+3]=0.45*b1;co.itC[i*6+4]=0.68*b1;co.itC[i*6+5]=b1;
    }
    co.iTail.geometry.attributes.position.needsUpdate=true;
    co.iTail.geometry.attributes.color.needsUpdate=true;
    co.iTail.material.opacity=tAlpha*0.55;
    // Coma size
    co.coma.scale.setScalar(Math.min(0.28,0.07/Math.sqrt(dist)));
  });
}
