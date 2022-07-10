// *********************** Missile movement ****************************


var missile_height = 60;
var missile_width = 20;
var interval_time = 20; // milliseconds
var rocket = new Image();
rocket.src = './Images/rocket.png';


function mod2pi(angle) {
  var new_angle = angle;

  if (angle > 0) {
    while (new_angle >= 2 * Math.PI) {
      new_angle -= 2 * Math.PI;
    }
  } else {
    while (new_angle < 0) {
      new_angle += 2 * Math.PI;
    }
  }

  return new_angle;
}


function add_vectors(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}


function subtract_vectors(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}


function mult(v, k) {
  return [v[0]*k, v[1]*k];
}


function rotation_matrix(angle) {
  var s = Math.sin(angle);
  var c = Math.cos(angle);
  return [[c, -s], [s, c]];
}


function onCanvas(pos) {
  var w = game.canvas.offsetWidth;
  var h = game.canvas.offsetHeight;
  return (pos[0] >= 0 && pos[1] >= 0 && pos[0] <= w && pos[1] <= h);
}



function transform(matrix, points, center) {
  image = [];
  for (let p of points) {
    var r = subtract_vectors(p, center);
    var rotated = [matrix[0][0]*r[0] + matrix[0][1]*r[1], matrix[1][0]*r[0] + matrix[1][1]*r[1]];
    image.push(add_vectors(center, rotated));
  }

  return image;
}


class Missile {
  position = [0, 0];
  speed = 150;
  direction = Math.PI/2; // radians clockwise from initial line
  angular_speed = 1.5;
  active = true;
  genes = []; //0 is no turning, 1 is clockwise, -1 is anti-clockwise
  fitness = 0;
  crashed = false;
  finished = false;

  constructor(position = [100, 100]) {
    this.position = position.slice();
  }

  draw() {
    var ctx = game.context;
    ctx.fillStyle = 'blue';
    var xcenter = this.position[0] + missile_height / 2;
    var ycenter = this.position[1] + missile_width / 2
    ctx.translate(xcenter, ycenter);
    ctx.rotate(this.direction);
    ctx.translate(-xcenter, -ycenter);
    ctx.drawImage(rocket, this.position[0], this.position[1], missile_height, missile_width);
    ctx.translate(xcenter, ycenter);
    ctx.rotate(-this.direction);
    ctx.translate(-xcenter, -ycenter);
  }

  move() {
    var t = interval_time / 1000;
    this.position[0] += this.speed * Math.cos(this.direction) * t;
    this.position[1] += this.speed * Math.sin(this.direction) * t;
  }

  turn(sign) {
    var t = interval_time / 1000;
    this.direction = mod2pi(this.direction + sign * this.angular_speed * t);
  }

  check_collisions() {
    let keypoints = [this.position]; // Check 6 major points on rectangle
    var w = [0, missile_width];
    var h = [missile_height, 0];
    keypoints.push(add_vectors(this.position, w));
    keypoints.push(add_vectors(this.position, h));
    keypoints.push(add_vectors(this.position, add_vectors(w, h)));
    var hlength2 = mult(h, 0.5);
    keypoints.push(add_vectors(this.position, hlength2));
    keypoints.push(add_vectors(this.position, add_vectors(hlength2, w)));
    var center = add_vectors(this.position, mult(add_vectors(w, h), 0.5));
    keypoints = transform(rotation_matrix(this.direction), keypoints, center);

    // Check if missile is on the canvas screen
    for (let i = 0; i < 4; i++) {
      var kp = keypoints[i];
      if (!onCanvas(kp)) {
        this.active = false;
        this.crashed = true;
        return;
      }
    }

    // Check if missile is in a wall
    for (let wall of walls) {
      var xmin = wall.start[0];
      var xmax = wall.start[0] + wall.width;
      var ymin = wall.start[1];
      var ymax = wall.start[1] + wall.height;

      for (let kp of keypoints) {
        if (xmin < kp[0] && kp[0] < xmax && ymin < kp[1] && kp[1] < ymax) {
          this.active = false;
          this.crashed = true;
          return;
        }
      }
    }
  }

  check_finish() {
    if ((this.position[0]-target[0])**2 + (this.position[1]-target[1])**2 <= 37**2) {
      this.active = false;
      this.finished = true;
    }
  }

  get_gene(time) {
    var count = 0;
    while (time > 0) {
      if (count >= gene_length) {
        this.active = false;
        return null;
      }
      time -= this.genes[count][1];
      count++;
    }
    return this.genes[count-1][0];
  }
}


// ************************ Genetic Algorithm **************************


class Population {
  missiles = [];
  generation = 1;
  size = 0;

  constructor(size = 10) {
    this.size = size;
  }

  wipe() {
    this.missiles = []
    this.populate();
    this.generation = 1;
  }

  populate() {
    for (var i = 0; i < this.size; i++) {
      var missile = new Missile(launch);
      var genes = [];
      var t = interval_time / 1000;
      for (var j = 0; j < gene_length; j++) {
        genes.push([Math.floor(Math.random() * 3) - 1, t + Math.random() / 2]);
      }
      missile.genes = genes;
      this.missiles.push(missile);
    }
  }

  generate() {
    this.generation += 1;
    var closest = Math.round(Math.sqrt(this.calculate_fitness()));
    var successes = 0;
    for (var m of this.missiles) {
      if (m.finished) {successes++;}
    }
    this.crossover();
    var success_rate = Math.round(successes * 100 / this.size);
    var info = document.getElementById('info');
    info.innerHTML = `&emsp;&emsp;Generation: ${this.generation}&emsp;&emsp;Success Rate: ${success_rate}%&emsp;&emsp;Closest Distance: ${closest}m`;
  }

  calculate_fitness() {
    var best = 0;
    for (var missile of this.missiles) {
      if (missile.finished) {missile.fitness = 3; best = Infinity;}
      else {
        var x = target[0] - missile.position[0];
        var y = target[1] - missile.position[1];
        missile.fitness = Math.min(1, 1/(x**2 + y**2));
        if (missile.fitness > best) {best = missile.fitness;}
        if (!missile.crashed) {
          missile.fitness *= 2;
        }
      }
    }
    return 1/best;
  }

  crossover() {
    var new_missiles = [];
    var total = 0;
    for (let i = 0; i < this.size; i++) {
      total += this.missiles[i].fitness;
    }
    for (let i = 0; i < this.size; i++) {
      var missile = new Missile(launch);
      var rand1 = Math.random() * total;
      var rand2 = Math.random() * total;
      //More likely to be chosen if higher fitness
      var parent1 = this.missiles[this.get_position(rand1)].genes;
      var parent2 = this.missiles[this.get_position(rand2)].genes;
      //Two point crossover
      var point1 = Math.floor(Math.random() * parent1.length);
      var point2 = Math.floor(Math.random() * parent1.length);
      var chromosome1 = parent1.slice(0, Math.min(point1, point2));
      var chromosome2 = parent2.slice(Math.min(point1, point2), Math.max(point1, point2));
      var chromosome3 = parent1.slice(Math.max(point1, point2));
      missile.genes = this.mutate(chromosome1.concat(chromosome2, chromosome3), 0.01);
      new_missiles.push(missile);
    }
    this.missiles = new_missiles.slice();
    start_game();
  }

  get_position(pos) {
    var count = 0;
    while (pos > 0) {
      pos -= this.missiles[count].fitness;
      count++;
    }
    return count - 1;
  }

  mutate(genes, probability) {
    var t = interval_time / 1000;
    for (let i = 0; i < genes.length; i++) {
      if (Math.random() <= probability) {
        genes[i] = [Math.floor(Math.random() * 3) - 1, t + Math.random() / 2];
      }
    }
    return genes;
  }
}


var gene_length = 40;
var launch = [200, 200];
var population = new Population(200);
population.populate();


// *********************** Wall configuration **************************


var walls = []
var moon = new Image();
moon.src = './Images/moon_surface.jpg';


class Wall {
  start = [0, 0];
  width = 0;
  height = 0;

  constructor(start, width, height) {
    this.start = start;
    this.width = width;
    this.height = height;
  }

  draw() {
    var ctx = bg.getContext('2d');
    var scale = Math.max(bg.width / moon.width, bg.height / moon.height);
    var x = (bg.width / 2) - (moon.width / 2) * scale;
    var y = (bg.height / 2) - (moon.height / 2) * scale;
    var region = new Path2D();
    region.rect(this.start[0], this.start[1], this.width, this.height);
    ctx.save();
    ctx.clip(region);
    ctx.drawImage(moon, x, y, moon.width*scale, moon.height*scale);
    ctx.restore();
  }
}


// ************************** Edit Layout ******************************


var edit_mode = 0;
var clicked = 0;
var start_click = [0, 0];
var minimum_width = 20;
var minimum_height = 20;
var target = [1000, 400];
var launchpad = new Image();
launchpad.src = './Images/launchpad.png';
var earth = new Image();
earth.src = './Images/earth.png';


function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}


function click(event) {
  var pos = [event.clientX-8, event.clientY-8]
  if (onCanvas(pos)) {
    if (clicked) {
      var end_click = pos.slice();
      var width = Math.abs(end_click[0] - start_click[0]);
      var height = Math.abs(end_click[1] - start_click[1]);
      if (width >= minimum_width && height >= minimum_height) {
        var top_left = [Math.min(end_click[0], start_click[0]), Math.min(end_click[1], start_click[1])];
        var wall = new Wall(top_left, width, height);
        wall.draw();
        walls.push(wall);
      }
      clicked = 1 - clicked;
    } else {
      start_click = pos.slice();
      clicked = 1 - clicked;
    }
  }
}


function edit() {
  if (edit_mode) {
    document.getElementById('edit').innerHTML = 'Edit';
    document.removeEventListener('click', click);
  } else {
    reset();
    var ctx = bg.getContext('2d');
    ctx.drawImage(earth, target[0]-37, target[1]-37);
    ctx.drawImage(launchpad, launch[0]-37, launch[1]-37);
    document.getElementById('edit').innerHTML = 'Done';
    delay(100).then(() => document.addEventListener('click', click));
  }

  edit_mode = 1 - edit_mode;
}


// *********************** Game setup **********************************


var pause = 0;
var started = 0;
var bg = document.getElementById('bg');
var update_count = 0;


var game = {
  canvas : document.createElement('canvas'),
  setup : function() {
    this.canvas.id = 'game_area';
    this.canvas.style.width ='100%';
    this.canvas.style.height='100%';
    this.context = this.canvas.getContext('2d');
    document.getElementById('canvas').appendChild(this.canvas);
    document.getElementById('game_area').width = this.canvas.offsetWidth;
    document.getElementById('game_area').height = this.canvas.offsetHeight;
    bg.width = bg.offsetWidth;
    bg.height = bg.offsetHeight;
  },
  start : function() {
    this.interval = setInterval(update_game, interval_time);
  },
  clear : function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
};


function reset() {
  started = 0;
  clearInterval(game.interval);
  game.clear();
  bg.getContext('2d').clearRect(0, 0, bg.width, bg.height);
  pause = 0;
  walls = [];
  population.wipe();
}


function update_game() {
  if (pause) {
    return;
  }
  update_count++;
  game.clear();
  var active = false;
  for (let m of population.missiles) {
    if (m.active) {
      active = true;
      var gene = m.get_gene(update_count * interval_time / 1000);
      if (gene != null) {
        m.turn(gene);
        m.move();
        m.check_collisions();
        m.check_finish();
        m.draw();
      }
    }
  }

  if (!active) {
    clearInterval(game.interval);
    population.generate();
  }
}


function start_game() {
  var finished = false;

  for (var m of population.missiles) {
    if (m.fitness == Infinity) {
      finished = true;
      break;
    }
  }
  update_count = 0;
  game.start();
}
