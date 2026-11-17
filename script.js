/*
  Ridam Chowdhary | Resume — interactions
  ---------------------------------------
  The page is themed as a crossword, so the motion is too:
    1. typeGrid()      the hero crossword is "typed in" square by square on load
    2. decode()        the name and each section title are "solved": random letters settle into the word
    3. currentNav()    the nav highlights the section you are reading
    4. magnetic()      the two hero links lean towards the pointer
    5. tiltCards()     project cards tilt with the pointer, and a light follows it on the back face
    6. cursor()        a selection square trails the pointer and paper squares light up behind it
    7. clickBurst()    a click throws out a few small squares
  Everything checks for touch screens and the "reduce motion" setting, and the page works fully without it.
*/
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  function randomLetter() {
    return LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }

  /* ---------- 1. Crossword typing intro ---------- */
  function typeGrid() {
    var cells = Array.prototype.slice.call(document.querySelectorAll(".puzzle .cell"));
    var letters = cells.filter(function (c) { return !c.classList.contains("block"); });

    if (reduceMotion) {
      cells.forEach(function (c) { c.classList.add("filled"); });
      return;
    }

    cells.filter(function (c) { return c.classList.contains("block"); })
         .forEach(function (c) { c.classList.add("filled"); });

    var i = 0;
    var START = 900;   // let the empty squares drop in first (CSS)
    var STEP = 120;    // ms per letter

    function next() {
      if (i > 0) letters[i - 1].classList.remove("is-active");
      if (i >= letters.length) return;
      var cell = letters[i];
      cell.classList.add("is-active", "filled", "just-typed");
      setTimeout(function () { cell.classList.remove("just-typed"); }, 300);
      i++;
      setTimeout(next, STEP);
    }
    setTimeout(next, START);
  }

  /* ---------- 2. Decode: random letters settle into the real word ---------- */
  function decode(el, duration) {
    if (reduceMotion || el.dataset.busy) return;
    var target = el.dataset.word || el.textContent;
    el.dataset.word = target;
    el.dataset.busy = "1";
    el.setAttribute("aria-label", target);

    var start = performance.now();
    duration = duration || 700;

    function frame(now) {
      var progress = Math.min((now - start) / duration, 1);
      var settled = Math.floor(progress * target.length);
      var tail = "";
      for (var k = settled; k < target.length; k++) {
        tail += target[k] === " " ? " " : randomLetter();
      }
      el.innerHTML = target.slice(0, settled) + (tail ? '<span class="scr">' + tail + "</span>" : "");
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = target;
        delete el.dataset.busy;
      }
    }
    requestAnimationFrame(frame);
  }

  function setUpDecode() {
    // the name: decode once, on load
    var lines = document.querySelectorAll("h1.decode .line");
    Array.prototype.forEach.call(lines, function (line, n) {
      setTimeout(function () { decode(line, 800); }, 250 + n * 250);
    });

    // section titles: decode once, the first time each one scrolls into view
    if (!("IntersectionObserver" in window)) return;
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          decode(entry.target, 650);
          seen.unobserve(entry.target);
        }
      });
    }, { threshold: 0.8 });
    Array.prototype.forEach.call(document.querySelectorAll("h2 .word"), function (w) { seen.observe(w); });
  }

  /* ---------- 3. Highlight the nav link for the section in view ---------- */
  function currentNav() {
    if (!("IntersectionObserver" in window)) return;
    var links = {};
    Array.prototype.forEach.call(document.querySelectorAll(".nav-links a"), function (a) {
      links[a.getAttribute("href").slice(1)] = a;
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = links[entry.target.id];
        if (link && entry.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove("is-current"); });
          link.classList.add("is-current");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });   // a thin band across the middle of the screen
    Array.prototype.forEach.call(document.querySelectorAll("main section[id]"), function (s) { spy.observe(s); });
  }

  /* ---------- 4. Magnetic hero links ---------- */
  function magnetic() {
    Array.prototype.forEach.call(document.querySelectorAll(".cta"), function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left - r.width / 2) * 0.25 + "px");
        el.style.setProperty("--my", (e.clientY - r.top - r.height / 2) * 0.35 + "px");
      });
      el.addEventListener("mouseleave", function () {
        el.style.setProperty("--mx", "0px");
        el.style.setProperty("--my", "0px");
      });
    });
  }

  /* ---------- 5. Card tilt and light ---------- */
  function tiltCards() {
    var MAX = 7;   // degrees
    Array.prototype.forEach.call(document.querySelectorAll(".flip-card"), function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;    // 0 to 1
        var y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--rx", ((0.5 - y) * MAX).toFixed(2) + "deg");
        card.style.setProperty("--ry", ((x - 0.5) * MAX).toFixed(2) + "deg");
        card.style.setProperty("--sx", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--sy", (y * 100).toFixed(1) + "%");
      });
      card.addEventListener("mouseleave", function () {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- 6. Cursor: selection square + lit paper squares ---------- */
  function cursor() {
    var GRID = 24;        // must match --grid in style.css
    var EASE = 0.2;
    var MAX_CELLS = 40;

    var box = document.createElement("div");
    box.className = "cursor-box";
    box.style.opacity = "0";
    document.body.appendChild(box);

    var mouseX = 0, mouseY = 0, boxX = 0, boxY = 0;
    var lastCell = "", liveCells = 0, started = false;

    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!started) {
        boxX = mouseX; boxY = mouseY;
        box.style.opacity = "";
        started = true;
      }
      var gx = Math.floor(e.pageX / GRID);
      var gy = Math.floor(e.pageY / GRID);
      var key = gx + "," + gy;
      if (key !== lastCell && liveCells < MAX_CELLS) {
        lastCell = key;
        var cell = document.createElement("span");
        cell.className = "ink-cell";
        cell.style.left = gx * GRID + "px";
        cell.style.top = gy * GRID + "px";
        document.body.appendChild(cell);
        liveCells++;
        cell.addEventListener("animationend", function () { cell.remove(); liveCells--; });
      }
    }, { passive: true });

    var clickable = "a, button, .cell, .flip-card, .chips li, .tag, .ledger li";
    document.addEventListener("mouseover", function (e) {
      box.classList.toggle("is-hot", !!e.target.closest(clickable));
    });
    document.addEventListener("mousedown", function () { box.classList.add("is-down"); });
    document.addEventListener("mouseup", function () { box.classList.remove("is-down"); });
    document.documentElement.addEventListener("mouseleave", function () { box.style.opacity = "0"; });
    document.documentElement.addEventListener("mouseenter", function () { if (started) box.style.opacity = ""; });

    (function follow() {
      boxX += (mouseX - boxX) * EASE;
      boxY += (mouseY - boxY) * EASE;
      box.style.translate = boxX + "px " + boxY + "px";
      requestAnimationFrame(follow);
    })();
  }

  /* ---------- 7. Click burst ---------- */
  function clickBurst() {
    var colours = ["#E4572E", "#F3B33D", "#1D2433"];
    document.addEventListener("click", function (e) {
      for (var i = 0; i < 9; i++) {
        var bit = document.createElement("span");
        var angle = (Math.PI * 2 * i) / 9 + Math.random() * 0.5;
        var dist = 30 + Math.random() * 40;
        bit.className = "burst-bit";
        bit.style.left = e.clientX + "px";
        bit.style.top = e.clientY + "px";
        bit.style.background = colours[i % colours.length];
        bit.style.setProperty("--dx", Math.cos(angle) * dist + "px");
        bit.style.setProperty("--dy", Math.sin(angle) * dist + "px");
        bit.style.setProperty("--rot", (Math.random() * 360 - 180) + "deg");
        document.body.appendChild(bit);
        bit.addEventListener("animationend", function () { this.remove(); });
      }
    });
  }

  /* ---------- start ---------- */
  typeGrid();
  setUpDecode();
  currentNav();
  if (finePointer && !reduceMotion) {
    magnetic();
    tiltCards();
    cursor();
    clickBurst();
  }
})();
