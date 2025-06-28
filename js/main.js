// Wantam Dating App - Full JS

const app = document.getElementById('app');

function showLoading(show) {
  let spinner = document.getElementById('loading-spinner');
  if (!spinner) {
    spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.className = 'hidden';
    document.body.appendChild(spinner);
  }
  spinner.classList.toggle('hidden', !show);
}

async function hashPassword(password) {
  showLoading(true);
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  showLoading(false);
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

let profiles = [];
let currentUser = null;
let pendingProfile = null;
let verificationCode = null;
let currentIndex = 0;
let likes = JSON.parse(localStorage.getItem('likes')) || {};
let matches = JSON.parse(localStorage.getItem('matches')) || {};
let chats = JSON.parse(localStorage.getItem('chats')) || {};
let notifications = JSON.parse(localStorage.getItem('notifications')) || [];

function saveData() {
  localStorage.setItem('profiles', JSON.stringify(profiles));
  localStorage.setItem('likes', JSON.stringify(likes));
  localStorage.setItem('matches', JSON.stringify(matches));
  localStorage.setItem('chats', JSON.stringify(chats));
  localStorage.setItem('notifications', JSON.stringify(notifications));
}

(async function init() {
  showLoading(true);
  const stored = localStorage.getItem('profiles');
  if (stored) {
    profiles = JSON.parse(stored);
  } else {
    try {
      const res = await fetch('http://localhost:3000/profiles');
      if (!res.ok) throw new Error();
      profiles = await res.json();
      localStorage.setItem('profiles', JSON.stringify(profiles));
    } catch {
      profiles = [];
    }
  }
  const remembered = localStorage.getItem('rememberedUser');
  if (remembered) {
    currentUser = JSON.parse(remembered);
    renderDashboard();
  } else {
    renderLoginForm();
  }
  showLoading(false);
})();

function clearApp() {
  while (app && app.firstChild) app.removeChild(app.firstChild);
}

function renderLoginForm() {
  clearApp();
  const section = document.createElement('section');
  section.innerHTML = `
    <h2>Login</h2>
    <form id="login-form">
      <label>Email:<input type="email" name="email" required /></label>
      <label>Password:<input type="password" name="password" required /></label>
      <label><input type="checkbox" name="remember" /> Remember Me</label>
      <button type="submit">Login</button>
      <p><a href="#" id="go-register">Register</a></p>
    </form>
  `;
  app.appendChild(section);
  document.getElementById('go-register').onclick = e => { e.preventDefault(); renderRegisterForm(); };
  section.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    showLoading(true);
    const form = e.target;
    const hashed = await hashPassword(form.password.value);
    const user = profiles.find(p => p.email === form.email.value && p.password === hashed);
    if (!user) { alert('Incorrect credentials'); showLoading(false); return; }
    currentUser = user;
    if (form.remember.checked) localStorage.setItem('rememberedUser', JSON.stringify(user));
    renderDashboard();
  };
}

function renderRegisterForm() {
  clearApp();
  const section = document.createElement('section');
  section.innerHTML = `
    <h2>Register</h2>
    <form id="register-form">
      <label>Name:<input name="name" required /></label>
      <label>DOB:<input type="date" name="dob" required /></label>
      <label>Email:<input type="email" name="email" required /></label>
      <label>Phone:<input name="phone" required /></label>
      <label>Password:<input type="password" name="password" required /></label>
      <label>Confirm:<input type="password" name="confirm" required /></label>
      <label>Gender:<br>
        <input type="radio" name="gender" value="male" required> Male
        <input type="radio" name="gender" value="female" required> Female
        <input type="radio" name="gender" value="other"> Other
      </label>
      <label>Bio:<textarea name="bio" required></textarea></label>
      <label>Hobbies:<select name="hobbies" multiple required>
        <option value="music">Music</option>
        <option value="sports">Sports</option>
        <option value="reading">Reading</option>
        <option value="traveling">Traveling</option>
      </select></label>
      <button type="submit">Register</button>
      <p><a href="#" id="go-login">Login</a></p>
    </form>
  `;
  app.appendChild(section);
  document.getElementById('go-login').onclick = e => { e.preventDefault(); renderLoginForm(); };
  section.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    showLoading(true);
    const form = e.target;
    const age = calculateAge(form.dob.value);
    if (age < 18) { alert('Must be 18+'); showLoading(false); return; }
    if (form.password.value !== form.confirm.value) { alert('Passwords mismatch'); showLoading(false); return; }
    const hashed = await hashPassword(form.password.value);
    pendingProfile = {
      name: form.name.value,
      dob: form.dob.value,
      age,
      email: form.email.value,
      password: hashed,
      phone: form.phone.value,
      gender: form.querySelector('input[name="gender"]:checked').value,
      bio: form.bio.value,
      hobbies: Array.from(form.hobbies.selectedOptions).map(o=>o.value),
      image: 'https://i.pravatar.cc/150?img=15'
    };
    verificationCode = Math.floor(100000 + Math.random() * 900000);
     alert(`Your code: ${verificationCode}`);
    renderVerificationForm();
    showLoading(false);
  };
}

function renderVerificationForm() {
  clearApp();
  const section = document.createElement('section');
  section.innerHTML = `
    <h2>Verify Your Phone</h2>
    <p>Enter the 6-digit code sent to ${pendingProfile.phone}</p>
    <form id="verify-form">
    <input id="sms-code" type="tel" maxlength="6" pattern="\\d{6}" inputmode="numeric" required placeholder="Enter 6-digit code" />
      <button type="submit">Verify</button>
    </form>
    <p><a href="#" id="resend-code">Resend Code</a> | <a href="#" id="cancel-reg">Cancel</a></p>
  `;
  app.appendChild(section);
  section.querySelector('#verify-form').onsubmit = e => {
    e.preventDefault();
    const code = section.querySelector('#sms-code').value;
    if (code === verificationCode.toString()) {
      profiles.push(pendingProfile);
      saveData();
      currentUser = pendingProfile;
      pendingProfile = null;
      alert('Registration successful!');
      renderDashboard();
    } else {
      alert('Incorrect code.');
    }
  };
  section.querySelector('#resend-code').onclick = e => {
    e.preventDefault();
    verificationCode = Math.floor(100000 + Math.random() * 900000);
alert(`New code: ${verificationCode}`);

  };
}

function renderDashboard() {
  clearApp();
  const section = document.createElement('section');
  section.className = 'dashboard';
  section.innerHTML = `
    <h2>Welcome, ${currentUser.name}!</h2>
    <nav>
      <button id="go-swiper">Swipe</button>
      <button id="go-matches">Matches</button>
      <button id="go-likes-you">Likes You</button>
      <button id="logout">Logout</button>
    </nav>
  `;
  app.appendChild(section);
  section.querySelector('#go-swiper').onclick = () => renderSwiper();
  section.querySelector('#go-matches').onclick = () => renderMatches();
  section.querySelector('#go-likes-you').onclick = () => renderLikesYou();
  section.querySelector('#logout').onclick = () => {
    localStorage.removeItem('rememberedUser');
    currentUser = null;
    renderLoginForm();
  };
}

function renderSwiper() {
  clearApp();
  currentIndex = 0;
  const section = document.createElement('section');
  section.className = 'swiper';
  app.appendChild(section);

  const candidates = profiles.filter(p => p.email !== currentUser.email);
  if (candidates.length === 0) {
    section.innerHTML = '<p>No profiles to show.</p>';
    return;
  }

  function showProfile(index) {
    const p = candidates[index];
    section.innerHTML = `
      <img src="${p.image || 'https://placehold.co/150x150?text=No+Image'}" alt="${p.name}" />
      <h3>${p.name}, ${p.age}</h3>
      <p>${p.bio}</p>
      <button id="like-btn">👍 Like</button>
      <button id="next-btn">➡️ Next</button>
    `;

    section.querySelector('#like-btn').onclick = () => {
      addLike(currentUser.email, p.email);
      if (checkForMutualMatch(currentUser.email, p.email)) {
        alert(`🎉 It's a match with ${p.name}!`);
      }
      next();
    };
    section.querySelector('#next-btn').onclick = next;
  }

  function next() {
    currentIndex = (currentIndex + 1) % candidates.length;
    showProfile(currentIndex);
  }

  showProfile(currentIndex);
}

function addLike(from, to) {
  if (!likes[from]) likes[from] = [];
  if (!likes[from].includes(to)) likes[from].push(to);
  if (!matches[from]) matches[from] = [];
  if (!matches[to]) matches[to] = [];
  if (likes[to] && likes[to].includes(from)) {
    if (!matches[from].includes(to)) matches[from].push(to);
    if (!matches[to].includes(from)) matches[to].push(from);
  }
  saveData();
}

function checkForMutualMatch(email1, email2) {
  return (
    likes[email1]?.includes(email2) &&
    likes[email2]?.includes(email1)
  );
}

function renderMatches() {
  clearApp();
  const section = document.createElement('section');
  section.className = 'matches';
  section.innerHTML = '<h2>Your Matches</h2>';
  const myMatches = matches[currentUser.email] || [];
  if (myMatches.length === 0) {
    section.innerHTML += '<p>No matches yet.</p>';
  } else {
    myMatches.forEach(email => {
      const p = profiles.find(u => u.email === email);
      section.innerHTML += `<div class="match-card">
        <img src="${p.image}" alt="${p.name}" />
        <h3>${p.name}</h3>
      </div>`;
    });
  }
  app.appendChild(section);
}

function renderLikesYou() {
  clearApp();
  const section = document.createElement('section');
  section.className = 'likes-you';
  section.innerHTML = '<h2>People Who Liked You</h2>';
  const likers = Object.keys(likes).filter(email => likes[email].includes(currentUser.email));
  if (likers.length === 0) {
    section.innerHTML += '<p>No one has liked you yet.</p>';
  } else {
    likers.forEach(email => {
      const p = profiles.find(u => u.email === email);
      section.innerHTML += `<div class="like-card">
        <h3>${p.name}</h3>
        <button onclick="addLike('${currentUser.email}', '${p.email}'); renderLikesYou();">Like Back</button>
      </div>`;
    });
  }
  app.appendChild(section);
}

function calculateAge(dob) {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
}
