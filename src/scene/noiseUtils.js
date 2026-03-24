import * as THREE from 'three';

// --- Value noise utilities ---
export function _hash(n) { return ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1; }

export function _sN(x, y, z) {
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const fx=x-ix,fy=y-iy,fz=z-iz;
  const ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
  const h=_hash;
  return h(ix+iy*57+iz*113)*(1-ux)*(1-uy)*(1-uz)+h(ix+1+iy*57+iz*113)*ux*(1-uy)*(1-uz)+
         h(ix+(iy+1)*57+iz*113)*(1-ux)*uy*(1-uz)+h(ix+1+(iy+1)*57+iz*113)*ux*uy*(1-uz)+
         h(ix+iy*57+(iz+1)*113)*(1-ux)*(1-uy)*uz+h(ix+1+iy*57+(iz+1)*113)*ux*(1-uy)*uz+
         h(ix+(iy+1)*57+(iz+1)*113)*(1-ux)*uy*uz+h(ix+1+(iy+1)*57+(iz+1)*113)*ux*uy*uz;
}

export function _sfbm(x,y,z,oct){ let v=0,a=0.5,f=1; for(let i=0;i<oct;i++){v+=_sN(x*f,y*f,z*f)*a;a*=0.5;f*=2;} return v; }

// Equirectangular texture generator: fn(u,v,nx,ny,nz,lat,lon) -> [r,g,b] 0-255
export function _mkTex(w,h,fn){
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d'),img=ctx.createImageData(w,h);
  for(let j=0;j<h;j++){
    const lat=Math.PI*(j/h-0.5),v=j/h;
    for(let i=0;i<w;i++){
      const lon=Math.PI*2*(i/w)-Math.PI,u=i/w;
      const nx=Math.cos(lat)*Math.cos(lon),ny=Math.sin(lat),nz=Math.cos(lat)*Math.sin(lon);
      const rgb=fn(u,v,nx,ny,nz,lat,lon);
      const k=(j*w+i)*4; img.data[k]=rgb[0]|0; img.data[k+1]=rgb[1]|0; img.data[k+2]=rgb[2]|0; img.data[k+3]=255;
    }
  }
  ctx.putImageData(img,0,0); return new THREE.CanvasTexture(c);
}

// --- Planet texture functions ---
export const _pTexFns={
  Earth:(u,v,nx,ny,nz,lat)=>{
    const latD=lat*180/Math.PI,n=_sfbm(nx*3,ny*3,nz*3,4);
    if(Math.abs(latD)>65+n*12) return [220+n*35,235+n*20,255];
    if(n>0.52){const h=(n-0.52)/0.3; return h>0.45?[120+h*65,100+h*45,75+h*50]:[30+h*50,90+h*65,20];}
    const d=_sfbm(nx*9,ny*9,nz*9,3)*0.5; return [10+d*15,50+d*40,110+d*65];
  },
  Mars:(u,v,nx,ny,nz,lat)=>{
    const latD=lat*180/Math.PI,n=_sfbm(nx*4,ny*4,nz*4,4);
    if(Math.abs(latD)>70+n*10) return [235,245,255];
    const cr=_sfbm(nx*12+5,ny*12,nz*12,2);
    return (cr>0.64&&cr<0.68)?[175,95,75]:[140+n*60,68+n*38,42+n*22];
  },
  Jupiter:(u,v,nx,ny,nz,lat)=>{
    const latD=lat*180/Math.PI,wave=_sfbm(nx*2,ny*8,nz*2,3);
    const band=Math.sin(latD*0.28+wave*4.5)*0.5+0.5;
    const grsLat=Math.abs(latD+23),grsLon=Math.abs((u-0.5)*360-5);
    const grs=Math.max(0,1-Math.sqrt((grsLat/7)**2+(grsLon/14)**2));
    return [Math.min(255,(175+band*65+grs*55)|0),Math.min(255,(115+band*55-grs*45)|0),Math.min(255,(75+band*35-grs*35)|0)];
  },
  Saturn:(u,v,nx,ny,nz,lat)=>{
    const latD=lat*180/Math.PI,wave=_sfbm(nx*1.5,ny*10,nz*1.5,3)*0.5;
    const band=Math.sin(latD*0.32+wave*3)*0.5+0.5;
    return [(192+band*48)|0,(162+band*42)|0,(102+band*28)|0];
  },
  Venus:(u,v,nx,ny,nz)=>{
    const n=_sfbm(nx*3+1,ny*4,nz*3,4),sw=_sfbm(nx*8,ny*2,nz*8,2)*0.3;
    return [(200+n*55)|0,(158+n*42+sw*30)|0,(75+n*32)|0];
  },
  Mercury:(u,v,nx,ny,nz)=>{
    const n=_sfbm(nx*5,ny*5,nz*5,4),cr=_sfbm(nx*15+3,ny*15,nz*15,2);
    return (cr>0.63&&cr<0.67)?[158,153,148]:[(98+n*62)|0,(93+n*57)|0,(88+n*52)|0];
  },
  Uranus:(u,v,nx,ny,nz,lat)=>{
    const latD=lat*180/Math.PI,band=Math.sin(latD*0.22)*0.5+0.5,n=_sfbm(nx*3,ny*3,nz*3,2)*0.15;
    return [(58+band*22+n*20)|0,(178+band*32+n*20)|0,(188+band*32+n*20)|0];
  },
  Neptune:(u,v,nx,ny,nz)=>{
    const n=_sfbm(nx*4,ny*4,nz*4,4),st=_sfbm(nx*8+2,ny*6,nz*8,2),spot=st>0.65?0.65:1;
    return [(18+n*32*spot)|0,(48+n*42*spot)|0,(158+n*65*spot)|0];
  }
};
