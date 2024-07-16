const canvasSketch = require('canvas-sketch');
const { math } = require('canvas-sketch-util');
const random = require('canvas-sketch-util/random')
const eases = require('eases')

const settings = {
  dimensions: [ 1080, 1920 ],
  animate: true,
};

const particules = [];
const cursor = {x:9999, y: 9999}; // para almacenar la posicion del cursor

let elCanvas;
let imgA;

const sketch = ({width, height, canvas}) => {
  let x, y, particule, radius;
 
  const imgACanvas = document.createElement('canvas');
  const imgAContext = imgACanvas.getContext('2d');

  imgACanvas.width = imgA.width;
  imgACanvas.height = imgA.height;

  imgAContext.drawImage(imgA, 0, 0);

  const imgAData = imgAContext.getImageData(0, 0, imgA.width, imgA.height).data;

  const numCircles = 120;
  const gap = 0.5;
  const gapDot = 0.5;
  let dotRadius = 5;
  let cirRadius = 0;
  const fitRadius = dotRadius;

  elCanvas = canvas;
  canvas.addEventListener('mousemove', onMouseDown);

  for (let i = 0; i < numCircles; i++){
      const circunferencia = Math.PI * 2 * cirRadius;
      const numFit = i ? Math.floor(circunferencia / (fitRadius * 2 + gapDot)) : 1;
      const fitSlice = Math.PI * 2 / numFit;
      let ix, iy, idx, r, g, b, colA;

    for (let j = 0; j < numFit; j++) {
      const theta = fitSlice * j;

      x = Math.cos(theta) * cirRadius;
      y = Math.sin(theta) * cirRadius;

      x += width * 0.5;
      y += height * 0.5;

      ix = Math.floor((x / width) * imgA.width);
      iy = Math.floor((y / height) * imgA.height);

      idx = (iy * imgA.width + ix) * 4;

      r = imgAData[idx + 0];
      g = imgAData[idx + 1];
      b = imgAData[idx + 2];

      colA = `rgb(${r}, ${g}, ${b})`;
      radius = dotRadius; 
      particule = new Particule ({x, y, radius, colA});
      particules.push(particule);
    }

    cirRadius += fitRadius * 2 + gap;
    dotRadius = (1 - eases.quadOut(i / numCircles)) * fitRadius;
  }

  return ({ context, width, height }) => {
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    context.drawImage(imgACanvas, 0, 0);

    particules.sort((a,b) => a.scale - b.scale);

    particules.forEach(particule => {
      particule.update();
      particule.draw(context);
    });
  };
};

const onMouseDown = (e) =>{
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  onMouseMove(e);
}

const onMouseMove = (e) => {
  const x = (e.offsetX / elCanvas.offsetWidth) * elCanvas.width;
  const y = (e.offsetY / elCanvas.offsetHeight) * elCanvas.height;
  
  cursor.x = x;
  cursor.y = y;
  console.log(cursor);
}

const onMouseUp = () => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);

  //reestablecer el valor
  cursor.x = 9999;
  cursor.y = 9999;
}

const loadImage = async(url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject();
    img.src = url;
  });
};

const start = async () => {
  imgA = await loadImage('images/messi.png')
  canvasSketch(sketch, settings);
};

start();

class Particule {
  constructor({x, y, radius = 10, colA}){
    //posicion
    this.x = x;
    this.y = y;
    
    //aceleracion
    this.ax = 0;
    this.ay = 0;

    //velocidad
    this.vx = 0;
    this.vy = 0;

    //posicion inicial
    this.ix = x;
    this.iy = y;

    this.radius = radius;
    this.scale = 1;

    this.color = colA;
    this.minDist = random.range(100, 200);
    this.pushFactor = random.range(0.01, 0.02); // para disminuir el valor de la aceleracion
    this.pullFactor = random.range(0.002, 0.006);
    this.dampFactor = random.range(0.90, 0.95);
  }

  update(){
    //calcular la distancia entre la particula y el cursor
    let dx, dy, dd, distDelta;
    //let idxColor;

   //pull force
    dx = this.ix - this.x;
    dy = this.iy - this.y;
    dd = Math.sqrt(dx * dx + dy * dy);

    this.ax = dx * this.pullFactor;
    this.ay = dy * this.pullFactor;

    this.scale = math.mapRange(dd, 0, 200, 1, 5);

    //push force
    dx = this.x - cursor.x;
    dy = this.y - cursor.y;

    //dd es la hipotenusa = a2 + b2
    dd = Math.sqrt(dx * dx + dy * dy)

    distDelta = this.minDist - dd;
    if(dd < this.minDist) {
      //valor de la aceleracion que sea mas fuerte cuanto mas cerca esta el cursor de la particula
      this.ax += (dx / dd) * distDelta * this.pushFactor;
      this.ay += (dy / dd) * distDelta * this.pushFactor;
    }
    
    // se incrementa la velocidad con la aceleracion
    this.vx += this.ax;
    this.vy += this.ay;

    // this.vx += this.dampFactor;
    // this.vy += this.dampFactor;

    // se incrementa la posicion con la velocidad
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(context) {
    context.save();
    context.translate(this.x, this.y);
    context.fillStyle = this.color;

    context.beginPath();
    context.arc(0,  0, this.radius * this.scale, 0, Math.PI *2);
    context.fill();
    context.restore();
  }
}