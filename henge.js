// henge.js
// Contains phone henge generator and drawing logic.

export const arrK = []; // array for keys

import { arrU } from './canvasUtils.js';
import { setArcStart, set2Pi, hide } from './helpers.js';
import { sequence } from './sequence.js';
import { setLinearGradient } from './color.js';
export const arrA = [];

export function savePhoneHenge25() {
const{ctx}=arrU[0];
const h=henge25(ctx);
const H={size:h.size,border:h.border,width:h.width,height:h.height,radius:h.cR,arrs:h.all7};
arrA.push({H});
}

/*22 Henge25*/
function henge25(ctx){
const spec={
    numberOf:25,  //16  //80,
   arcRadius:158, //145 //180,
    arcStart:setArcStart(0.45),
     originX:ctx.mid.x,
     originY:ctx.mid.y,
	  corner:1.5,
	 hFactor:42,
	 wFactor:21,
      border:0.2
};
let h25=hGen(spec);
return h25;
}

/*23 Generate henge*/
function hGen(spec){let h={
		size:spec.numberOf,
	      aR:spec.arcRadius,
	      sA:spec.arcStart,
	     pi2:set2Pi(),
	      oX:spec.originX,
	      oY:spec.originY,
		  cR:spec.corner,
	   width:spec.wFactor * spec.corner,
	  height:spec.hFactor * spec.corner,
	  border:spec.border,
	       R:[],
	       X:[],
	       Y:[],
	      X1:[],
	      Y1:[],
	      X2:[],
	      Y2:[],
	    all7:[],
  loadArrays:function(){
        
		/*how many touch points and how big*/        
        let max=this.size;
        let radius=this.width/2;
		arrK.push(max, radius);

		for(let i=0;i<max;i++){
		/*rotation angles*/
			let angle=this.sA+i*this.pi2/max;
			if(angle>this.pi2){
				angle=angle-this.pi2;
			}
			this.R.push(parseFloat(angle.toFixed(2))
		);/*centre coordinates*/
		const x=this.oX+this.aR*Math.cos(angle);
		const y=this.oY+this.aR*Math.sin(angle);
		this.X.push(parseFloat(x.toFixed(2)));
		this.Y.push(parseFloat(y.toFixed(2)));
		/*corner coordinates*/
		const x1=x-this.width/2;
		const y1=y-this.height/2;
		const x2=x1+this.width;
		const y2=y1+this.height;
		this.X1.push(parseFloat(x1.toFixed(2)));
		this.Y1.push(parseFloat(y1.toFixed(2)));
		this.X2.push(parseFloat(x2.toFixed(2)));
		this.Y2.push(parseFloat(y2.toFixed(2)));}
		
		/*Pack 7 arrays*/
		this.all7.push(this.X,this.Y,this.R,this.X1,this.Y1,this.X2,this.Y2);
		/*Pack key touch points*/
		arrK.push(this.X,this.Y)}
		};
	h.loadArrays();
	return h;
}

export function drawPhoneHenge25(state) {
const stateBits = getStateBits(state);
drawState(stateBits);
}

function getStateBits(state){ /*5-bit code*/
	return sequence[state % sequence.length];
}

export function drawState(sB) {
const{ ctx } = arrU[0];
const ctxA = ctx;
const{H} = arrA[0];
/*Unpack H.arrs*/
const[X, Y, R, X1, Y1, X2, Y2] = H.arrs;
const max = H.size, w = H.width, h = H.height, r = H.radius;
ctxA.strokeStyle = 'white';
ctxA.lineWidth = H.border;

for(let i = 0; i < max; i++){
const family = (i % 5) + 1; const mask = sB[i % 5]; const bit = mask * family; 
const x = X[i]; const y = Y[i]; const angle = R[i]; 
const g = ctxA.createLinearGradient(X1[i], Y1[i], X2[i], Y2[i]);

/*Draw retrieved objects*/
ctxA.beginPath();
ctxA.save();
ctxA.translate(x, y);
ctxA.rotate(angle);
ctxA.translate(-x, -y);
ctxA.roundedRect(x, y, w, h, r);
 switch (bit){/*hide or show*/
	case 0:
		ctxA.fillStyle = hide();
	break;
	default:
		ctxA.fillStyle = setLinearGradient(family, g);
	break;
	}
ctxA.fill();
ctxA.stroke();
ctxA.closePath();
ctxA.restore();}
}