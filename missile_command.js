// Missile Command Clone (c) 2012 Sean Brennan
// About:
// Missile Command was a stand alone coin operated video game released in 1980
// It was innovative for using a trackball interface.
// Normal Game Play:
//   Three missile batteries could be used to kill incoming ICBM missiles.
//   Normally, you have 6 cities.
//   If an ICBM gets hits a city or battery, it is removed from the game level.
//   If all cities are destroyed, the game ends.
//   An ICBM may spawn other ICBMs. (MIRBs)
//   After a certian number of points, cities may be restored.
//   Batteries are rebuilt every level.
// Composition:
//   The game is played on a field with city sites and missile battery sites.
//   The sites are hard coded.
//   There is a maximum of 3 batteries and 6 cities.
//   A background image is providied.
//   The missile batteries start with a finite number of missiles at each stage.
//   Each stage has a fixed number of incoming ICBMs.
// Reference:\
// http://www.arcade-museum.com/game_detail.php?game_id=8715
//  TODO(sean): differences: icbms slower, missiles faster, colors change.
//              icbm trails disappear after icbm dies.  Not a hard change.
//              bonus is on same screen.
//              The End more dramatic.
//  Bonus city every 10000 points.
// From:
// 
// Missile	25 points
// Killer Satellite	100 points
// Bomber	100 points
// Smart Bomb	125 points
// Stage bonus: Unused missiles	5 points each
// Stage bonus: Saved Cities	100 points each
// Score Multiplier
// Waves 1 and 2	1x scoring
// Waves 3 and 4	2x scoring
// Waves 5 and 6	3x scoring
// Waves 7 and 8	4x scoring
// Waves 9 and 10	5x scoring
// Waves 11 and beyond	6x scoring

// Globals:
// Geometry:
//   800 by 600 should be fine*
var xres = 800;
var yres = 600;
var xres_inv = 1.0 / 800.;
var yres_inv = 1.0 / 600.;
var mouseDisable = false;
var xy;
var twoPi = Math.PI * 2.0;
// Battery Defaults (centered)
var MISSILE_RELOAD_CAP = 10;
var battery = [];
var battery_x = [90, 385, 725];
var battery_y = 558;
var battery_deltas_x = [0, -10, 10, -20, 0, 20, -30, -10, 10, 30];
var battery_deltas_y = [  -20, -10, -10, 0, 0, 0, 10, 10, 10, 10];
var batt_one_shoot = false;
var batt_two_shoot = false;
var batt_three_shoot = false;
var mouse_x = 400;
var mouse_y = 300;
// City Defaults (centered)
var cities = [];
var city_x = [165, 242, 308, 456, 542, 624];
var city_y = [559, 563, 561, 565, 544, 562];
var score = 0;
var bonusMultiplier = 1;
// ICBM Defaults
var icbms = [];
var icbm_vel = 0.8;
var icbm_count = 0;
var icbm_timer = 0;  // cycles until next missile.
var icbm_prob = 0.0; // probability of MIRV bifircation.
// Bombers and Satellites
var bombers = [];
var bomber_count = 0;
var bomber_timer = 0;  // cycles until next bomber.
var bomber_vel = 0.9;
var satellites = [];
var satellite_count = 0;
var satellite_timer = 0;  // cycles until next satellite.
var satellite_vel = 1.0;
// Explosion Defaults
var booms = [];
var boom_max = 50.0;
var boom_vel = 2;
// Level defaults
var level = 1;
// Bonus Counters
// Canvas contexts
var my_canvas;
var ctx;
// Event cruft
var currEvent = null;
var ckar = 0;
var keycode = 0;
var charcode = 0;
var which = 0;
var count = 0;
var walltime = 0;
var split_prob = 100;

// game management
var game_state = 0;  // 0 - start, 1 - play, 2 - game over
var game_timeout;  // timeout before pressing a key to start a new game.
var missiles = []; // array of objects .x_targ, .y_targ, .x_vel, .y_vel, x y.
var diag = "";
// now, wait a second.  Timers to change levels.
var wait_level_end = 0; 
var wait_level_next = 0;
var pause = false;

///// Functions ////////
// No:
Element.prototype.leftTopScreen = function() {
  var x = this.offsetLeft;
  var y = this.offsetTop;
  var element = this.offsetParent;
  while (element !== null) {
      x = parseInt (x) + parseInt (element.offsetLeft);
      y = parseInt (y) + parseInt (element.offsetTop);
      element = element.offsetParent;
  }
  return new Array (x, y);
}

// Aye:
// TODO(fix) offset for all browsers.  stackoverflow or some such.


var init = function() {
  walltime = 0;
  score = 0;
  level = 1;
  game_timeout = 20;
  my_canvas = document.getElementById('myCanvas');
  //xy = my_canvas.leftTopScreen(); 
  xy = [0, 0];
  ctx = my_canvas.getContext('2d');
  ctx.lineWidth = 1;
  populate_batteries();
  populate_icbms();
  populate_bombers_and_satellites();
  populate_cities();
  satellite_timer = 400 + Math.random() * 200;
  bomber_timer = 400 + Math.random() * 200;
  batt_one_shoot = false;
  batt_two_shoot = false;
  batt_three_shoot = false;
  bonusMultiplier = 1;
}

var clear = function() {
  var clearcolor = "rgb(" + "0" + ",0,0)";
  ctx.fillStyle = clearcolor;
  ctx.fillRect(0, 0, 800 , 600);
  //ctx.strokeStyle = "green";
  //ctx.lineWidth = 3;
 // ctx.beginPath();
  //ctx.rect(0, 0, 800, 600);
  //ctx.closePath();
  //ctx.stroke();
  //ctx.lineWidth = 1.;
}

var game_clear = function() {
  var clearcolor = "rgb(0,0,0)";
  ctx.fillStyle = clearcolor;
  ctx.fillRect(0, 0, 180, 50);
  //ctx.fillRect(0, 500, 800, 600);
  //ctx.fill();
}

var display_levelinfo = function() {
  // clear();
  for (var i = 0; i < missiles.length; ++i) {
      erase_icbm(missiles[i]);
      missiles.splice(i, 1);
  }
  setMouse(true);    // Disable crosshair.
  draw_crosshair(0); // Erase old crosshair.
  ctx.fillStyle = "purple";
  ctx.font = "24pt Helvetica";
  ctx.fillText("Bonus Multiplier: " + bonusMultiplier + "X", 100, 50);
  var miscount = 0;
  miscount += battery[0].ammo;
  miscount += battery[1].ammo;
  miscount += battery[2].ammo;
  var misbonus = miscount * 5 * bonusMultiplier;
  ctx.fillText("Missiles " + misbonus, 100, 80);
  for (var i = 0; i < miscount; i++) {
    draw_missile(320 + i * 14, 80);
  }
  var citcount = cities.length;
  var citbonus = citcount * 100 * bonusMultiplier;
  ctx.fillText("Cities " + citbonus, 100, 130);
  for (var i = 0; i < citcount; i++) {
    draw_city(320 + i * 35, 130);
  }
  var bonus = misbonus + citbonus;
  var tot = score + bonus
  ctx.fillText("Bonus cities and missiles:" + bonus, 100, 300);
  ctx.fillText("Score: " + tot, 100, 400);
  if (citcount == 0) { // Game over...
      ctx.fillStyle = "red";
      ctx.fillText("The End", 100, 200);
  } else {
      ctx.fillText("Advancing to level " + level, 100, 200);
      //ctx.fillText("Get ready... " + Math.floor(wait_level_next / 10), 100, 350);
  }
  if (wait_level_next < 0) {
    populate_batteries();
    populate_icbms();
    populate_bombers_and_satellites();
    score += bonus;
    if (level > 10) {
      bonusMultiplier = 6;
    } else if (level > 8) {
      bonusMultiplier = 5;
    } else if (level > 6) {
      bonusMultiplier = 4;
    } else if (level > 4) {
      bonusMultiplier = 3;
    } else if (level > 2) {
      bonusMultiplier = 2;
    } else {
      bonusMultiplier = 1;
    }
    // TODO(sean): bonus city??
    if (citcount == 0) { // Game over...
      clear();
      game_state = 2;
    } else {
      clear();
      setMouse(false);
      game_state = 1;
    }
  } else {
    wait_level_next--;
  }
}

var game = function() {
  if (pause == true) {
    ctx.fillStyle = "Yellow";
    ctx.font = "24pt Helvetica";
    ctx.fillText("Paused.", 20, 40);
    return;
  }
  if (game_state == 2) { // Game over man.
    clear();
    ctx.fillStyle = "purple";
    ctx.font = "24pt Helvetica";
    // ctx.fillText("Welcome to Missile Command", 40, 100);
    ctx.fillText("Game Over", 40, 200);
    ctx.fillStyle = "blue";
    ctx.fillText("Score: " + score, 40, 140);
    if (game_timeout < 1) {
      ctx.fillText("Press any key to start.", 40, 240);
    }
    game_timeout -= 1;
  } else if (game_state == 1) { // Game running.
    update();
  } else if (game_state == 4) { // Level Change.
    display_levelinfo();
  } else {  // Splash screen.
    clear();
    ctx.fillStyle = "red";
    ctx.font = "24pt Ariel";
    ctx.fillText("Missile Command", 40, 100);
    if (game_timeout < 1) {
      ctx.fillText("Press any key to start.", 40, 240);
    }
    game_timeout -= 1;
  }
}

var moveIt = function() {
  launch_missile();
  try_icbm(false, 0, 0);
  try_bomber();
  try_satellite();
  move_launch();
  move_icbms();
  move_bombers();
  move_satellites();
  move_booms();
  detect_collide();
  // Detect exposions
}

var drawIt = function() {
  draw_ground();
  draw_batteries();
  draw_launch();
  draw_bombers();
  draw_satellites();
  draw_cities();
  draw_booms();
  draw_icbms();
  draw_text();
}

var draw_text = function() {
  ctx.fillStyle = "red";
  ctx.fillText(" " + score,10, 40);
  // ctx.fillText("clock:" + walltime, 640, 40);
  //ctx.fillText("Level " + level,10, 40);
  //ctx.fillText("The keycode is : " + keycode, 10, 80);
  // ctx.fillText("Missiles: " + missiles.length, 10, 120);
  // ctx.fillText("ICBMS: " + icbms.length, 10, 140);
  // ctx.fillText("diag: " + diag, 10, 580);
  
}

var levelchange = function() {
  if (icbm_count == 0 && icbms.length == 0 && booms.length == 0) {
    if (wait_level_end < 0) {
      // Start next level.
      level++;
      wait_level_end = 50;
      wait_level_next = 200; // TODO(sean): in seconds?
      game_state = 4;
    } else {
      wait_level_end--;
    }
  }
}

var update = function() {
  moveIt();
  game_clear();
  drawIt();
  levelchange();
  walltime += 1;
  if (walltime > 2000000) {
    walltime = 0;
  }
}

var populate_icbms = function() {
  icbm_count = level * 4; // TODO(sean): make more interesting.
  icbms = [];
}

var populate_bombers_and_satellites = function() {
  satellites = [];
  bombers = [];
  satellite_count = 0;
  bomber_count = 0;
  if (level > 5) {
    satellite_count = Math.floor(Math.log(level / 2)) + 1;
    bomber_count = Math.floor(Math.log(level / 2)) + 1;
  } else if (level > 2) {
    bomber_count = Math.floor(Math.log(level / 2)) + 1;
  }
}
  

var populate_batteries = function() {
  var i;
  battery = [];
  for (i = 0; i < 3; i += 1) {
    var j = {};
    j.ammo = MISSILE_RELOAD_CAP;
    if (i == 1) {
      j.velocity = 5;
    } else  {
      j.velocity = 3;
    }
    battery.push(j);
  }
}

var populate_cities = function() {
  cities = [];
  for (var i = 0; i < 6; i++) {
    var j = {};
    j.x = city_x[i];
    j.y = city_y[i];
    cities.push(j);
  }
}

var draw_missile = function(x, y) {
  var missile_color = "rgb(0,0,255)";
  var missile_border = "rgb(180,180,190)";
  ctx.beginPath();
  ctx.moveTo(x, y -7);
  ctx.lineTo(x-2, y-5);
  ctx.lineTo(x-2, y);
  ctx.lineTo(x-4, y+2);
  ctx.lineTo(x-4, y+5);
  ctx.lineTo(x, y+3);
  ctx.lineTo(x+4, y+5);
  ctx.lineTo(x+4, y+2);
  ctx.lineTo(x+2, y);
  ctx.lineTo(x+2, y-5);
  ctx.lineTo(x, y -7);

  ctx.strokeStyle = missile_border;
  ctx.fillStyle = missile_color;
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

var move_launch = function() {
  for (var idx = 0; idx < missiles.length; idx++) {
    var x = missiles[idx].x;
    var y = missiles[idx].y;
    var dx = missiles[idx].x_targ - x;
    var dy = missiles[idx].y_targ - y;
    var dist2 = (dx * dx + dy * dy);
    //diag = "dist " + dist2;
    if (dist2 < 75.0) {
      erase_icbm(missiles[idx]);
      //draw_launch_target(missiles[idx], true);
      try_boom(missiles[idx].x,  missiles[idx].y);
      missiles.splice(idx, 1);
    } else {
      missiles[idx].x += missiles[idx].x_vel;
      missiles[idx].y += missiles[idx].y_vel;
      if (Math.abs(missiles[idx].x - missiles[idx].prev_x) > 2.0 || Math.abs(missiles[idx].y - missiles[idx].prev_y) > 2.0) {
        missiles[idx].prev_x_2 = missiles[idx].prev_x;
        missiles[idx].prev_y_2 = missiles[idx].prev_y;
        missiles[idx].prev_x = x;
        missiles[idx].prev_y = y;
      }
    }
  }
}

var move_satellites = function() {
  diag += "s " + satellites.length;
  for (var idx = 0; idx < satellites.length; idx++) {
    var x = satellites[idx].x;
    var y = satellites[idx].y;
    var dx = satellites[idx].x_targ - x;
    var dy = satellites[idx].y_targ - y;
    var dist2 = (dx * dx + dy * dy);
    if (dist2 < 75.0) {  // Hit the target.
      satellites.splice(idx, 1);
    } else {
      satellites[idx].x += satellites[idx].x_vel;
      satellites[idx].y += satellites[idx].y_vel;
      if (Math.abs(satellites[idx].x - satellites[idx].prev_x) > 2.0 || Math.abs(satellites[idx].y - satellites[idx].prev_y) > 2.0) {
        satellites[idx].prev_x = x;
        satellites[idx].prev_y = y;
      }
      if (walltime % (split_prob / 2) == 0 && Math.random() > 0.6 && x > 10 && x < 790) {
        try_icbm(true, x, y);
      }
    }
  }
}

var move_bombers = function() {
  diag = "b " + bombers.length;
  for (var idx = 0; idx < bombers.length; idx++) {
    var x = bombers[idx].x;
    var y = bombers[idx].y;
    var dx = bombers[idx].x_targ - x;
    var dy = bombers[idx].y_targ - y;
    var dist2 = (dx * dx + dy * dy);
    if (dist2 < 75.0) {  // Hit the target.
      bombers.splice(idx, 1);
    } else {
      bombers[idx].x += bombers[idx].x_vel;
      bombers[idx].y += bombers[idx].y_vel;
      if (Math.abs(bombers[idx].x - bombers[idx].prev_x) > 2.0 || Math.abs(bombers[idx].y - bombers[idx].prev_y) > 2.0) {
        bombers[idx].prev_x = x;
        bombers[idx].prev_y = y;
      }
      if (walltime % (split_prob / 2) == 0 && Math.random() > 0.6 && x > 10 && x < 790) {
        try_icbm(true, x, y);
      }
    }
  }
}

var move_icbms = function() {
  for (var idx = 0; idx < icbms.length; idx++) {
    var x = icbms[idx].x;
    var y = icbms[idx].y;
    var dx = icbms[idx].x_targ - x;
    var dy = icbms[idx].y_targ - y;
    var dist2 = (dx * dx + dy * dy);
    if (dist2 < 75.0) {  // Hit the target.
      erase_icbm(icbms[idx]);
      try_boom(icbms[idx].x,  icbms[idx].y);
      icbms.splice(idx, 1);
    } else {
      icbms[idx].x += icbms[idx].x_vel;
      icbms[idx].y += icbms[idx].y_vel;
      if (Math.abs(icbms[idx].x - icbms[idx].prev_x) > 2.0 || Math.abs(icbms[idx].y - icbms[idx].prev_y) > 2.0) {
        icbms[idx].prev_x_2 = icbms[idx].prev_x;
        icbms[idx].prev_y_2 = icbms[idx].prev_y;
        icbms[idx].prev_x = x;
        icbms[idx].prev_y = y;
      }
      if (walltime % split_prob == 1 && Math.random() > 0.9) {
        try_icbm(true, icbms[idx].x, icbms[idx].y);
      }
    }
  }
}

var move_booms = function() {
  for (var idx = 0; idx < booms.length; idx++) {
    var r = booms[idx].r;
    if (r < 0.0) {
      booms.splice(idx, 1);
    } else {
      var v = booms[idx].v;
      if ((v > 0.0) && (r > boom_max)) {
          booms[idx].r += v;
          booms[idx].v = -boom_vel / 2.0;
          booms[idx].color = "black";
      } else {
        booms[idx].r += v;
      }
    }
  }
}

var erase_icbm = function(incoming) {
  //var erase_color = "rgba(0, 0, 0, 1)";
  var erase_color = "black";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(incoming.x_org, incoming.y_org);
  ctx.lineTo(incoming.x, incoming.y);
  ctx.strokeStyle = erase_color;
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 1;
}

//var city_x = [165, 242, 308, 456, 542, 624];
//var city_y = [559, 563, 561, 565, 544, 562];
//var battery_x = [90, 385, 725];
// var battery_y = 558;
var draw_cup = function(x, y) {
  ctx.lineTo(x - 31, y);
  ctx.lineTo(x - 25, y - 5);
  ctx.lineTo(x - 18, y);
  ctx.lineTo(x + 18, y);
  ctx.lineTo(x + 25, y - 5);
  ctx.lineTo(x + 31, y);
}

var draw_mountain = function(x, y) {
  ctx.lineTo(x - 40, y);
  ctx.lineTo(x - 20, y - 30);
  ctx.lineTo(x - 10, y - 25);
  ctx.lineTo(x + 10, y - 25);
  ctx.lineTo(x + 20, y - 30);
  ctx.lineTo(x + 40, y);
}

var draw_ground = function() {
  ctx.beginPath();
  ctx.moveTo(5, 595);
  ctx.lineTo(5, 568);
  draw_mountain(90, 560);  // Battery 1
  draw_cup(165, 559);
  draw_cup(242, 563);
  draw_cup(308, 561);
  // Battery 2
  draw_mountain(385, 560);  // Battery 1
  draw_cup(456, 565);
  draw_cup(542, 544);
  draw_cup(624, 562);
  // Battery 3
  draw_mountain(725, 560);  // Battery 1
  ctx.lineTo(790, 560);
  ctx.lineTo(790, 595);
  ctx.lineTo(5, 595);
  ctx.closePath();
  ctx.strokeStyle = "rgb(0,255,0)";
  ctx.fillStyle = "rgb(0,200,0)";
  ctx.fill();
  ctx.stroke();
}

var draw_booms = function() {
  var boom_color = "rgb(240,100,0)";
  var boom_border = "rgb(0,0,0)";
  ctx.lineWidth=3;
  for (var i = 0; i < booms.length; i++) {
    var x = booms[i].x;
    var y = booms[i].y;
    var r = booms[i].r;
    ctx.beginPath();
    //ctx.strokeStyle = boom_border;
    ctx.strokeStyle = booms[i].color;
    //ctx.fillStyle = boom_color;
    ctx.arc(x, y, r, 0.0, twoPi);
    //ctx.fill();
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

var draw_crosshair = function(p) {
  var mx;
  var my;
  mx = mouse_x;
  my = mouse_y;
  if (p == 1) {
    var crosshair_color = "rgb(0,0,255)";
    var crosshair_border = "rgb(255,255,255)";
  } else {
    var crosshair_color = "rgb(0,0,0)";
    var crosshair_border = "rgb(0,0,0)";
  }
  ctx.beginPath();
  ctx.strokeStyle = crosshair_border;
  ctx.fillStyle = crosshair_color;
  var cross_w = 2;
  var cross_h = 9;
  ctx.fillRect(mx - cross_w, my - cross_h,  cross_w * 2, cross_h * 2);
  ctx.fillRect(mx - cross_h, my - cross_w,  cross_h * 2, cross_w * 2);
  ctx.closePath();
  //ctx.fill();
  //ctx.stroke();
}

var draw_launch_target = function(interceptor, erase_it) {
  if (erase_it == true) {
    var target_color = "black";
  } else {
    var target_color = "rgb(255, 255, 128)";
  }
  var x = interceptor.x_targ;
  var y = interceptor.y_targ;
  ctx.beginPath();
  ctx.fillStyle = target_color;
  ctx.moveTo(x  , y-2);
  ctx.lineTo(x-4, y-6);
  ctx.lineTo(x-6, y-4);
  ctx.lineTo(x-2, y  );
  ctx.lineTo(x-6, y+4);
  ctx.lineTo(x-4, y+6);
  ctx.lineTo(x  , y+2);
  ctx.lineTo(x+4, y+6);
  ctx.lineTo(x+6, y+4);
  ctx.lineTo(x+2, y  );
  ctx.lineTo(x+6, y-4);
  ctx.lineTo(x+4, y-6);
  ctx.lineTo(x  , y-2);
  ctx.fill();
  ctx.closePath();
};

var draw_city = function(x, y) {
  var city_color = "rgb(0,240,240)";
  var city_border = "rgb(255,255,255)";
  ctx.beginPath();
  ctx.strokeStyle = city_border;
  ctx.fillStyle = city_color;
  ctx.moveTo(x-14, y-1);
  ctx.lineTo(x-10, y-1);
  ctx.lineTo(x-10, y-10);
  ctx.lineTo(x-6, y-10);
  ctx.lineTo(x-6, y-3);
  ctx.lineTo(x-2, y-3);
  ctx.lineTo(x-2, y-8);
  ctx.lineTo(x+2, y-8);
  ctx.lineTo(x+2, y-1);
  ctx.lineTo(x+6, y-1);
  ctx.lineTo(x+6, y-7);
  ctx.lineTo(x+10, y-7);
  ctx.lineTo(x+10, y-3);
  ctx.lineTo(x+14, y-3);
  ctx.lineTo(x+14, y-8);
  ctx.lineTo(x+14, y);
  ctx.lineTo(x-14, y);
  ctx.lineTo(x-14, y-10);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
  var city_color2 = "rgb(240,0,240)";
  var city_border2 = "rgb(255,255,255)";
  ctx.beginPath();
  ctx.strokeStyle = city_border2;
  ctx.fillStyle = city_color2;
  ctx.moveTo(x-14, y-1);
  ctx.lineTo(x-10, y-1);
  ctx.lineTo(x-10, y-1);
  ctx.lineTo(x-6, y-1);
  ctx.lineTo(x-6, y-2);
  ctx.lineTo(x-2, y-2);
  ctx.lineTo(x-2, y-4);
  ctx.lineTo(x+2, y-4);
  ctx.lineTo(x+2, y-1);
  ctx.lineTo(x+6, y-1);
  ctx.lineTo(x+6, y-5);
  ctx.lineTo(x+10, y-5);
  ctx.lineTo(x+10, y-1);
  ctx.lineTo(x+14, y-3);
  ctx.lineTo(x+14, y-2);
  ctx.lineTo(x+14, y-1);
  ctx.lineTo(x-14, y-1);
  ctx.fill();
  ctx.closePath();
}

var draw_cities = function() {
  for (var i = 0; i < cities.length; i++) {
    draw_city(cities[i].x, cities[i].y);
  }
}

var draw_icbms = function() {
  var icbm_color = "rgb(240,240,0)";
  var icbm_border = "rgb(255,0,0)";
  ctx.lineWidth = 2;
  for (var i = 0; i < icbms.length; i++) {
    m = icbms[i];
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.prev_x, m.prev_y);
    ctx.closePath();
    ctx.strokeStyle = icbm_color;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(m.prev_x, m.prev_y);
    ctx.lineTo(m.prev_x_2, m.prev_y_2);
    ctx.strokeStyle = icbm_border;
    ctx.closePath();
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}
    
var draw_launch = function() {
  var missile_color = "rgb(240,240,10)";
  var missile_border = "rgb(200,0,200)";
  ctx.lineWidth = 2;
  for (var idx=0; idx < missiles.length; idx++) {
    m = missiles[idx];
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.prev_x, m.prev_y);
    ctx.strokeStyle = missile_border;
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(m.prev_x, m.prev_y);
    ctx.lineTo(m.prev_x_2, m.prev_y_2);
    ctx.strokeStyle = missile_color;
    ctx.closePath();
    ctx.stroke();
    draw_launch_target(m, false);
  }
  ctx.lineWidth = 1;
}

var draw_batteries = function() {
  var i;
  var j;
  for (i = 0; i < 3; i++) {
    if (battery[i].ammo > 0) {
      var b_x = battery_x[i]
      var b_y = battery_y;
      for (j = 0; j < battery[i].ammo; j += 1) {
        draw_missile(b_x + battery_deltas_x[j], b_y + battery_deltas_y[j]);
      }
    }
  }
}

var bomber_xpts = [2, 11, 7, 3, 1, -2, -1,  -3, -5,  -5, -6, -4, -3, -5, -2];
var bomber_ypts = [1, 1, -1, -2, -4, -5, -2, -2, -4, -1, 0, 0, 1, 6, 6];


var grow = function(z, growit) {
  if (growit == true) {
    if (z < 0) {
      z -= 1;
    } else {
      z += 1;
    }
  }
  return z;
}

var draw_bomber = function(x, y, goleft, bomber_color, bomber_border, erase) {
  var scale = 2;
  var mirror = 1;
  if (goleft == false) {
    mirror = -1;
  }
  mirror = mirror * scale;
  ctx.beginPath();
  ctx.moveTo(grow(bomber_xpts[0], erase) * mirror + x, grow(bomber_ypts[0], erase) * scale + y);
  for (var i = 0; i < bomber_xpts.length; ++i) {
    ctx.lineTo(grow(bomber_xpts[i], erase) * mirror + x, grow(bomber_ypts[i], erase) * scale + y);
  }
  ctx.lineTo(grow(bomber_xpts[0], erase) * mirror + x, grow(bomber_ypts[0], erase) * scale + y);
  ctx.closePath();
  ctx.strokeStyle = bomber_border;
  ctx.fillStyle = bomber_color;
  ctx.fill();
  ctx.stroke();
}
  

var draw_bombers = function() {
  ctx.lineWidth = 2;
  for (var idx=0; idx < bombers.length; idx++) {
    m = bombers[idx];
    draw_bomber(m.prev_x, m.prev_y, false, "black", "black", true);
    draw_bomber(m.x, m.y, false, "rgb(255, 0, 255);", "rgb(128, 255, 128)", false);
  }
  ctx.lineWidth = 1;
}

var draw_satellite = function(x, y, satellite_color, satellite_border, erase) {
  ctx.lineWidth = 2;
  if (erase == true) {
    ctx.lineWidth = 4;
  }
  var r = 5;
  ctx.beginPath();
  ctx.moveTo(x + grow(-9, erase), y + grow(-9, erase));
  ctx.lineTo(x + grow( 9, erase), y + grow( 9, erase));
  ctx.moveTo(x + grow(-9, erase), y + grow( 9, erase));
  ctx.lineTo(x + grow( 9, erase), y + grow(-9, erase));
  ctx.closePath();
  ctx.strokeStyle = satellite_border;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, grow(r, erase), 0.0, twoPi);
  ctx.fillStyle = satellite_color;
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
  ctx.lineWidth = 1;
}

var draw_satellites = function() {
  var satellite_color = "rgb(140,140,10)";
  var satellite_border = "rgb(100,0,100)";
  for (var idx=0; idx < satellites.length; idx++) {
    m = satellites[idx];
    draw_satellite(m.prev_x, m.prev_y, "black", "black", true);
    draw_satellite(m.x, m.y, satellite_color, satellite_border, false);
  }
}

var try_boom = function(x, y) {
  var j = {};
  j.x = x;
  j.y = y;
  j.r = 1;
  j.v = boom_vel;
  j.color = "rgb(255,0,50)";
  booms.push(j);
}

var try_launch = function(idx) {
  if (battery[idx].ammo > 0) {
    var j = {};
    j.x = battery_x[idx];
    j.y = battery_y - 15;
    j.x_org = j.x;
    j.y_org = j.y;
    j.prev_x_2 = j.x;
    j.prev_y_2 = j.y;
    j.prev_x = j.x;
    j.prev_y = j.y;
    j.x_targ = mouse_x;
    j.y_targ = mouse_y;
    var dx = j.x_targ - j.x;
    var dy = j.y_targ - j.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1.0) {
      j.x_vel = 2.0 * dx * battery[idx].velocity / dist;
      j.y_vel = 2.0 * dy * battery[idx].velocity / dist;
    } else {
      j.x_vel = 0.1;
      j.y_vel = 0.1;
    }
    missiles.push(j);
    battery[idx].ammo -= 1;
  }
}

var try_satellite = function() {
  if (satellite_timer < 1) {
    if (satellite_count > 0) {
      var j = {};
      j.x = 840;
      j.y =  Math.random() * 50.0 + 100.0
      j.x_org = j.x
      j.y_org = j.y
      j.prev_x = j.x
      j.prev_y = j.y
      j.x_targ = -50;
      j.y_targ = j.y;
      var dx = j.x_targ - j.x;
      var dy = j.y_targ - j.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      j.x_vel = dx * satellite_vel / dist;
      j.y_vel = dy * satellite_vel / dist;
      satellites.push(j);
      satellite_count--;
      if (satellite_count < 0) {
        satellite_count = 0;
      }
      satellite_timer = Math.floor(Math.random() * 180.0 + 800.0);
    }
  } else {
    satellite_timer--;
  }
}

var try_bomber = function() {
  if (bomber_timer < 1) {
    if (bomber_count > 0) {
      var j = {};
      j.x = 840;
      j.y =  Math.random() * 100.0 + 200.0
      j.x_org = j.x
      j.y_org = j.y
      j.prev_x = j.x
      j.prev_y = j.y
      j.x_targ = -50;
      j.y_targ = j.y;
      var dx = j.x_targ - j.x;
      var dy = j.y_targ - j.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      j.x_vel = dx * bomber_vel / dist;
      j.y_vel = dy * bomber_vel / dist;
      bombers.push(j);
      bomber_count--;
      if (bomber_count < 0) {
        bomber_count = 0;
      }
      bomber_timer = Math.floor(Math.random() * 180.0 + 800);
    }
  } else {
    bomber_timer--;
  }
}

      
var try_icbm = function(override, x, y) {
  if (icbm_timer < 1 || override == true) {
    if (icbm_count > 0 || override == true) {
      var j = {};
      if (override == true) {
        j.x = x;
        j.y = y;
      } else {
        j.x = Math.random() * 700.0 + 50.0
        j.y = -10.0;
      }
      j.x_org = j.x
      j.y_org = j.y
      j.prev_x = j.x
      j.prev_y = j.y
      j.prev_x_2 = j.x
      j.prev_y_2 = j.y
      var sigma = (600. - j.y + 10.0) * yres_inv;
      j.x_targ = (Math.random() * 900.0 - 100.0) * sigma + j.x * (1.0 - sigma); 
      j.y_targ = 565.0;
      var dx = j.x_targ - j.x;
      var dy = j.y_targ - j.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      j.x_vel = dx * icbm_vel / dist;
      j.y_vel = dy * icbm_vel / dist;
      icbms.push(j);
      icbm_count--;
      if (icbm_count < 0) {
        icbm_count = 0;
      }
      icbm_timer = Math.floor(Math.random() * 180.0);
    }
  } else {
    icbm_timer--;
  }
}

var launch_missile = function() {
  if  (batt_one_shoot) {
    try_launch(0);
    batt_one_shoot = false;
  }
  if  (batt_two_shoot) {
    try_launch(1);
    batt_two_shoot = false;
  }
  if  (batt_three_shoot) {
    try_launch(2);
    batt_three_shoot = false;
  }
}

var detect_collide = function() {
  var dx = 0;
  var dy = 0;
  for (var i = 0; i < booms.length; i++) {
    var bx = booms[i].x;
    var by = booms[i].y;
    var br = booms[i].r;

    for (var j = 0; j < icbms.length; j++) {
      dx = icbms[j].x - bx;
      dy = icbms[j].y - by;
      if ((dx * dx + dy * dy - br * br) < 0.0) { // Kill.
        score += 25 * bonusMultiplier;
        // diag = "Erasing from (" + Math.floor(icbms[j].x) + "," + Math.floor(icbms[j].y) + ") (" +  Math.floor(icbms[j].x_org) + "," +  Math.floor(icbms[j].y_org) + ")  ";
        erase_icbm(icbms[j]);
        try_boom(icbms[j].x, icbms[j].y);
        icbms.splice(j, 1);
      }
    }

    for (var j = 0; j < bombers.length; j++) {
      dx = bombers[j].x - bx;
      dy = bombers[j].y - by;
      if ((dx * dx + dy * dy - br * br) < 0.0) { // Kill.
        score += 100 * bonusMultiplier;
        try_boom(bombers[j].x, bombers[j].y);
        bombers.splice(j, 1);
      }
    }

    for (var j = 0; j < satellites.length; j++) {
      dx = satellites[j].x - bx;
      dy = satellites[j].y - by;
      if ((dx * dx + dy * dy - br * br) < 0.0) { // Kill.
        score += 100 * bonusMultiplier;
        try_boom(satellites[j].x, satellites[j].y);
        satellites.splice(j, 1);
      }
    }

    for (var j = 0; j < cities.length; j++) {
      dx = cities[j].x - bx;
      dy = cities[j].y - by;
      if ((dx * dx + dy * dy - br * br) < 0.0) { // Kill.
        try_boom(cities[j].x, cities[j].y);
        cities.splice(j, 1);
      }
    }
    for (var j = 0; j < 3; j++) {
      if (battery[j].ammo > 0) {
        dx = battery_x[j] - bx;
        dy = battery_y - by;
        if ((dx * dx + dy * dy - br * br) < 0.0) { // Kill.
          // alert("Boom at (" + battery_x[j] + ", " + battery_y + ")");
          try_boom(battery_x[j], battery_y);
          battery[j].ammo = 0;
        }
      }
    }
  }
}

var getEvtType = function(evt) {
  count += 1;
}

var getMouse = function(evt) {
  if (mouseDisable == false) {
    draw_crosshair(0);
    var x = 0;
    var y = 0;
    if (evt.layerX || evt.layerX == 0) { // Firefox
      x = evt.layerX; y = evt.layerY;
    } else if (evt.offsetX || evt.offsetX == 0) { // Opera
      x = evt.offsetX; y = evt.offsetY;
    }
    mouse_x = x - xy[0];
    mouse_y = y - xy[1];
    if (mouse_y > 500) {
      mouse_y = 500;
    }
    draw_crosshair(1);
  }
}

var setMouse = function(disable) {
  if (disable == true) {
    mouseDisable = true;
  } else {
    mouseDisable = false;
  }
}
  

var kup = function(evt) {
  keycode = evt.keyCode;
  if (keycode == 37) {  // left arrow
     dir_left = false;
  } else if (keycode == 39) {  // right arrow
     dir_right = false;
  };
  getEvtType(evt);
};

var kdown = function(evt) {
  keycode = evt.keyCode;
  
  if (keycode == 65) {  // a
     batt_one_shoot = true;
  } else if (keycode == 83) {  // s
     batt_two_shoot = true;
  } else if (keycode == 87) {  // d
     batt_two_shoot = true;
  } else if (keycode == 68) {  // d
     batt_three_shoot = true;
  } else if (keycode == 80) {  // p
     pause = (pause == true) ? false : true;
  } else if (keycode == 27) {  // esc
     game_state = 2;
  }
  getEvtType(evt);
  if ((game_state == 2) || (game_state == 0)) {
    if (game_timeout < 1) {
      clear();
      game_state = 1;
      init();
    }
  }
}
