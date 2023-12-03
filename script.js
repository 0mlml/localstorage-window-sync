const canvas = document.getElementsByTagName('canvas')[0];
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

document.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
let mouseDown = false;
document.addEventListener('mousedown', _ => mouseDown = true);
document.addEventListener('mouseup', _ => mouseDown = false);

const ctx = canvas.getContext('2d');

const id = Math.random().toString(36).substring(2, 11);

const updatePosition = () => {
  const screenOffsetLeft = window.screenLeft || window.screenX;
  const screenOffsetTop = window.screenTop || window.screenY;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  localStorage.setItem(id, `${screenOffsetLeft},${screenOffsetTop},${windowWidth},${windowHeight}`);
}

const getPositions = () => {
  const positions = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === id) continue;
    positions.push(localStorage.getItem(key).split(',').map(n => parseInt(n)));
  }
  return positions;
}

const getWorldEdges = () => {
  let left, right, top, bottom;
  const positions = getPositions();
  positions.forEach(([x, y, w, h]) => {
    if (!left || x < left) left = x;
    if (!right || x + w > right) right = x + w;
    if (!top || y < top) top = y;
    if (!bottom || y + h > bottom) bottom = y + h;
  });
  return [left, right, top, bottom];
}

class SoftBodyNode {
  static #worldEdges = [];
  static #bounce = 0.9;
  static #damping = 0.92;
  static #stiffness = 0.2;

  constructor(x, y, radius) {
    this.radius = radius;

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
  }

  draw() {
    ctx.save();
    ctx.fillStyle = '#f88';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  update(targetX, targetY) {
    this.vx += this.ax;
    this.vy += this.ay;
    this.ax = 0;
    this.ay = 0;

    this.vx *= SoftBodyNode.#damping;
    this.vy *= SoftBodyNode.#damping;

    this.x += this.vx;
    this.y += this.vy;

    const [left, right, top, bottom] = SoftBodyNode.#worldEdges;
    if (this.x < left) {
      this.x = left;
      this.vx *= -SoftBodyNode.#bounce;
    }
    if (this.x > right) {
      this.x = right;
      this.vx *= -SoftBodyNode.#bounce;
    }
    if (this.y < top) {
      this.y = top;
      this.vy *= -SoftBodyNode.#bounce;
    }
    if (this.y > bottom) {
      this.y = bottom;
      this.vy *= -SoftBodyNode.#bounce;
    }

    if (targetX && targetY) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const force = SoftBodyNode.#stiffness * distance / 1000;
      this.ax += dx * force;
      this.ay += dy * force;
    }
  }

  static updateEdges() {
    SoftBodyNode.#worldEdges = getWorldEdges();
  }
}

class SoftBody {
  static #nodeCount = 12;
  static #gravity = 0.1;

  constructor(x, y, radius) {
    this.radius = radius;

    this.nodes = [];

    for (let i = 0; i < SoftBody.#nodeCount; i++) {
      const angle = (i / SoftBody.#nodeCount) * Math.PI * 2;
      const nodeX = x + radius * Math.cos(angle);
      const nodeY = y + radius * Math.sin(angle);
      this.nodes.push(new SoftBodyNode(nodeX, nodeY, radius));
    }

    this.targetX = x;
    this.targetY = y;
    this.isGrabbed = false;
    this.isHovered = false;
  }

  draw() {
    this.isHovered = false;
    for (const node of this.nodes) {
      node.draw();
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
    for (let i = 1; i < this.nodes.length; i++) {
      ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
    }
    ctx.fillStyle = '#fff';
    ctx.closePath();
    if (ctx.isPointInPath(mouseX, mouseY)) {
      canvas.style.cursor = 'pointer';
      ctx.fillStyle = '#f88';
      this.isHovered = true;
    }
    ctx.fill();
    ctx.restore();
  }

  update() {
    if (this.isGrabbed) {
      this.targetX = mouseX;
      this.targetY = mouseY;
    } else {
      this.targetY += SoftBody.#gravity;
    }

    const centerX = this.nodes.reduce((sum, node) => sum + node.x, 0) / this.nodes.length;
    const centerY = this.nodes.reduce((sum, node) => sum + node.y, 0) / this.nodes.length;

    const dx = this.targetX - centerX;
    const dy = this.targetY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const force = distance / 100000;

    SoftBodyNode.updateEdges();
    for (const i in this.nodes) {
      const angle = (i / SoftBody.#nodeCount) * Math.PI * 2;
      const nodeX = this.targetX + this.radius * Math.cos(angle);
      const nodeY = this.targetY + this.radius * Math.sin(angle);

      this.nodes[i].ax += dx * force;
      this.nodes[i].ay += dy * force;

      this.nodes[i].update(nodeX, nodeY);
    }
  }
}


let bodies = [];

bodies.push(new SoftBody(100, 100, 50));

(function loop() {
  updatePosition();
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();


  for (const body of bodies) {
    if (mouseDown && body.isHovered) {
      body.isGrabbed = true;
    } else if (!mouseDown) {
      body.isGrabbed = false;
    }
    body.update();
    body.draw();
  }

  requestAnimationFrame(loop);
})();