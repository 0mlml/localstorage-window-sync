const canvas = document.getElementsByTagName('canvas')[0];
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

window.addEventListener('resize', () => {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
});

const id = Math.random().toString(36).substring(2, 11);
let amAuthority = false;

const getAuthority = () => {
  const authority = localStorage.getItem('authority');
  if (authority) {
    const split = authority.split(',');
    return [split[0], parseInt(split[1])];
  }
  return null;
}

const claimAuthority = (force = false) => {
  const authority = getAuthority();
  if (authority && Date.now() - authority[1] < 300 && !force) return;
  localStorage.setItem('authority', `${id},${Date.now()}`);
  amAuthority = true;
}

const heartBeat = () => {
  const authority = getAuthority();
  if (!authority) {
    claimAuthority();
    return;
  }

  const [authorityId, authorityTime] = authority;
  if (authorityId == id) {
    localStorage.setItem('authority', `${authorityId},${Date.now()}`);
  } else if (Date.now() - authorityTime > 300) {
    claimAuthority();
  } else {
    amAuthority = false;
  }
}

setInterval(heartBeat, 100);

let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => {
  localStorage.setItem('mousePosition', `${cxsx(e.clientX)},${cysy(e.clientY)}`);
});

let mouseDown = false;
document.addEventListener('mousedown', e => {
  e.preventDefault();
  if (e.button == 0) {
    localStorage.setItem('mouseDown', 'true');
  } else {
    if (amAuthority) {
      bodies.push(new SoftBody(cxsx(e.clientX), cysy(e.clientY), Math.random() * 40 + 20));
    }
  }
});
document.addEventListener('contextmenu', e => {
  e.preventDefault();
});
document.addEventListener('mouseup', e => {
  if (e.button == 0) {
    localStorage.setItem('mouseDown', 'false');
  }
});

let mouseWindow = null;
document.documentElement.addEventListener('mouseenter', () => {
  localStorage.setItem('mouseWindow', id);
  claimAuthority(true);
});
document.documentElement.addEventListener('mouseleave', () => {
  localStorage.setItem('mouseWindow', null);
});

const fetchMouse = () => {
  const mouse = localStorage.getItem('mousePosition');
  if (mouse) {
    const [x, y] = mouse.split(',').map(n => parseInt(n));
    mouseX = x;
    mouseY = y;
  }
  const mouseDownStr = localStorage.getItem('mouseDown');
  if (mouseDownStr) {
    mouseDown = mouseDownStr === 'true';
  }
  const mouseWindowStr = localStorage.getItem('mouseWindow');
  if (mouseWindowStr) {
    mouseWindow = mouseWindowStr;
  }
}

const ctx = canvas.getContext('2d');

const updatePosition = () => {
  if (amAuthority) {
    let now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith('pos')) continue;
      if (key === id) continue;
      if (localStorage.getItem(key).split(',').length < 5 || now - parseInt(localStorage.getItem(key).split(',')[4]) > 500) {
        localStorage.removeItem(key);
      }
    }
  }

  const screenOffsetLeft = window.screenLeft;
  const screenOffsetTop = window.screenTop;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  localStorage.setItem('pos' + id, `${screenOffsetLeft},${screenOffsetTop},${screenWidth},${screenHeight},${Date.now()}`);
}

const getPositions = () => {
  const positions = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith('pos')) continue;
    positions.push(localStorage.getItem(key).split(',').slice(0, 4).map(n => parseInt(n)))
  }
  return positions;
}

const sxcx = x => x - window.screenX
const sycy = y => y - window.screenY;
const cxsx = x => x + window.screenX;
const cysy = y => y + window.screenY;

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

const getAllBoxesContainingPoint = (x, y) => {
  const positions = getPositions();
  let containingBoxes = [];

  positions.forEach(([left, top, width, height]) => {
    const right = left + width;
    const bottom = top + height;

    if (x >= left && x <= right && y >= top && y <= bottom) {
      containingBoxes.push({ left, top, right, bottom });
    }
  });

  if (containingBoxes.length === 0) {
    return SoftBody.worldEdges;
  }

  return containingBoxes;
};

const unionOfBoxes = (boxes) => {
  if (boxes.length === 0) return null;

  let unionBox = { ...boxes[0] };
  boxes.forEach(box => {
    unionBox.left = Math.min(unionBox.left, box.left);
    unionBox.top = Math.min(unionBox.top, box.top);
    unionBox.right = Math.max(unionBox.right, box.right);
    unionBox.bottom = Math.max(unionBox.bottom, box.bottom);
  });

  return [unionBox.left, unionBox.right, unionBox.top, unionBox.bottom];
};

class SoftBodyNode {
  static #bounce = 0.9;
  static #damping = 0.84;
  static #stiffness = 0.3;

  constructor(x, y, radius) {
    this.radius = radius;

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
  }

  update(targetX, targetY) {
    this.vx += this.ax;
    this.vy += this.ay;
    this.ax = 0;
    this.ay = 0;

    this.vx *= SoftBodyNode.#damping;
    this.vy *= SoftBodyNode.#damping;

    const boxes = getAllBoxesContainingPoint(this.x, this.y);
    const [left, right, top, bottom] = unionOfBoxes(boxes);

    this.x += this.vx;
    this.y += this.vy;

    let centerForceX = 0;
    let centerForceY = 0;

    if (this.x < left) {
      this.x = left;
      this.vx *= -SoftBodyNode.#bounce;
      centerForceX = this.vx * SoftBodyNode.#stiffness;
    }
    if (this.x > right) {
      this.x = right;
      this.vx *= -SoftBodyNode.#bounce;
      centerForceX = this.vx * SoftBodyNode.#stiffness;
    }
    if (this.y < top) {
      this.y = top;
      this.vy *= -SoftBodyNode.#bounce;
      centerForceY = this.vy * SoftBodyNode.#stiffness;
    }
    if (this.y > bottom) {
      this.y = bottom;
      this.vy *= -SoftBodyNode.#bounce;
      centerForceY = this.vy * SoftBodyNode.#stiffness;
    }

    if (targetX && targetY) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const force = SoftBodyNode.#stiffness * distance / 1000;
      this.ax += dx * force;
      this.ay += dy * force;
    }

    return [centerForceX, centerForceY];
  }
}

class SoftBody {
  static worldEdges = [];

  static #nodeCount = 30;
  static #bounce = 0.9;
  static #follow = 0.98;
  static #damping = 0.99;

  constructor(x, y, radius, nodeCount = SoftBody.#nodeCount) {
    this.radius = radius;

    this.nodes = [];

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const nodeX = x + radius * Math.cos(angle);
      const nodeY = y + radius * Math.sin(angle);
      this.nodes.push(new SoftBodyNode(nodeX, nodeY, radius));
    }

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;

    this.isGrabbed = false;
    this.isHovered = false;
  }

  draw() {
    this.isHovered = false;
    ctx.beginPath();
    ctx.moveTo(sxcx(this.nodes[0].x), sycy(this.nodes[0].y));
    for (let i = 1; i < this.nodes.length; i++) {
      ctx.lineTo(sxcx(this.nodes[i].x), sycy(this.nodes[i].y));
    }
    ctx.fillStyle = '#fff';
    ctx.closePath();
    if (ctx.isPointInPath(sxcx(mouseX), sycy(mouseY))) {
      canvas.style.cursor = 'pointer';
      ctx.fillStyle = '#f88';
      this.isHovered = true;
    }
    ctx.fill();
  }

  update() {
    this.vx += this.ax;
    this.vy += this.ay;

    if (this.isGrabbed) {
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      this.ax = dx / distance * SoftBody.#follow;
      this.ay = dy / distance * SoftBody.#follow;
    } else {
      this.ax = 0;
      this.ay = 0;
    }

    this.vx *= SoftBody.#damping;
    this.vy *= SoftBody.#damping;

    const boxes = getAllBoxesContainingPoint(this.x, this.y);
    const [left, right, top, bottom] = unionOfBoxes(boxes);

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < left) {
      this.x = left;
      this.vx *= -SoftBody.#bounce;
    }
    if (this.x > right) {
      this.x = right;
      this.vx *= -SoftBody.#bounce;
    }
    if (this.y < top) {
      this.y = top;
      this.vy *= -SoftBody.#bounce;
    }
    if (this.y > bottom) {
      this.y = bottom;
      this.vy *= -SoftBody.#bounce;
    }

    this.centerX = this.nodes.reduce((sum, node) => sum + node.x, 0) / this.nodes.length;
    this.centerY = this.nodes.reduce((sum, node) => sum + node.y, 0) / this.nodes.length;

    const dx = this.x - this.centerX;
    const dy = this.y - this.centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const force = distance / 100000;

    for (const i in this.nodes) {
      const angle = (i / this.nodes.length) * Math.PI * 2;
      const nodeX = this.x + this.radius * Math.cos(angle);
      const nodeY = this.y + this.radius * Math.sin(angle);

      this.nodes[i].ax += dx * force;
      this.nodes[i].ay += dy * force;

      let [pushBackX, pushBackY] = this.nodes[i].update(nodeX, nodeY);
      this.x += pushBackX;
      this.y += pushBackY;
    }
  }

  static updateEdges() {
    this.worldEdges = getWorldEdges();
  }
}

const parseBodies = (str) => {
  const bodies = JSON.parse(str);
  if (!bodies) return [];
  const parsedBodies = [];
  for (const body of bodies) {
    parsedBodies.push(new SoftBody(body.tx, body.ty, body.radius));
    parsedBodies[parsedBodies.length - 1].x = body.tx;
    parsedBodies[parsedBodies.length - 1].y = body.ty;
    parsedBodies[parsedBodies.length - 1].vx = body.txv;
    parsedBodies[parsedBodies.length - 1].vy = body.tyv;
    parsedBodies[parsedBodies.length - 1].ax = body.txa;
    parsedBodies[parsedBodies.length - 1].ay = body.tya;
    parsedBodies[parsedBodies.length - 1].nodes = body.nodes.map(node => {
      let n = new SoftBodyNode(node.x, node.y, body.radius)
      n.vx = node.vx;
      n.vy = node.vy;
      n.ax = node.ax;
      n.ay = node.ay;
      return n;
    });
  }
  return parsedBodies;
}

const saveBodies = () => {
  const sBodies = [];
  for (const body of bodies) {
    const nodes = [];
    for (const node of body.nodes) {
      nodes.push({ x: node.x, y: node.y, vx: node.vx, vy: node.vy, ax: node.ax, ay: node.ay });
    }
    sBodies.push({ tx: body.x, ty: body.y, txv: body.vx, tyv: body.vy, txa: body.ax, tya: body.ay, radius: body.radius, nodes });
  }
  localStorage.setItem('bodies', JSON.stringify(sBodies));
}

let bodies = [];

(function loop() {
  fetchMouse();
  updatePosition();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  canvas.style.cursor = 'default';
  if (amAuthority) {
    if (bodies.length === 0) {
      bodies.push(new SoftBody(cxsx(canvas.width / 2), cysy(canvas.height / 2), 50));
    }
    SoftBody.updateEdges();
    for (const body of bodies) {
      if (mouseDown && body.isHovered) {
        body.isGrabbed = true;
      } else if (!mouseDown) {
        body.isGrabbed = false;
      }
      body.update();
      body.draw();
    }
    saveBodies();
  } else {
    const bodiesStr = localStorage.getItem('bodies');
    bodies = parseBodies(bodiesStr);
    for (const body of bodies) {
      body.draw();
    }
  }
  requestAnimationFrame(loop);
})();