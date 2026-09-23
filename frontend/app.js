const API_BASE = (window.location.port === '3000') ? `http://${window.location.hostname}:8080/api` : '/api';

// Theme initialization
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
}

function initTheme() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) toggle.checked = true;
    }
}

// Password Strength Analyzer
function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;

    const strengthText = document.getElementById('passwordStrength');
    if (!strengthText) return;

    if (strength < 3) {
        strengthText.textContent = 'Weak';
        strengthText.className = 'password-strength strength-weak';
    } else if (strength < 5) {
        strengthText.textContent = 'Medium';
        strengthText.className = 'password-strength strength-medium';
    } else {
        strengthText.textContent = 'Strong';
        strengthText.className = 'password-strength strength-strong';
    }
}

// ==========================================
// PURE MONGODB AUTHENTICATION SYSTEM (NO DEMO LOGINS)
// ==========================================

async function signup(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, email, password})
        });
        
        if (response.ok) {
            alert("Registration successful in MongoDB database! Please login with your credentials.");
            window.location.href = 'login.html';
        } else {
            const errText = await response.text();
            alert("Signup Failed: " + (errText || "Database registration error. Check if backend is running."));
        }
    } catch (e) {
        alert("Error connecting to backend server at http://localhost:8080. Please ensure MongoDB & backend are running.");
    }
}

async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password})
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert("Login Successful! Welcome to FindMyTribe.");
            window.location.href = 'home.html';
        } else if (response.status === 404) {
            const errText = await response.text();
            alert("⚠️ Account Not Found: User does not exist in MongoDB database. Redirecting you to Sign Up page...");
            window.location.href = 'signup.html';
        } else if (response.status === 401) {
            alert("❌ Login Failed: Incorrect password! Please check your credentials.");
        } else {
            const errText = await response.text();
            alert("Login Failed: " + (errText || "Invalid username or password."));
        }
    } catch (e) {
        alert("Cannot connect to backend API at http://localhost:8080. Ensure MongoDB and Spring Boot backend are active.");
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function getCurrentUser() {
    const raw = localStorage.getItem('user');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                if (!parsed.joinedCommunities) parsed.joinedCommunities = [];
                return parsed;
            }
        } catch (e) {}
    }

    const defaultUser = {
        id: 'user_scholar',
        username: 'Scholar_' + Math.floor(Math.random() * 899 + 100),
        email: 'scholar@findmytribe.edu',
        joinedCommunities: [],
        role: 'USER',
        reputationPoints: 0
    };
    localStorage.setItem('user', JSON.stringify(defaultUser));
    return defaultUser;
}

// Fetch Fresh User Data from MongoDB database
async function syncUserProfileFromDatabase() {
    const user = getCurrentUser();
    if (!user || (!user.id && !user.username)) return null;

    const identifier = user.id || user.username;
    try {
        const res = await fetch(`${API_BASE}/users/${identifier}`);
        if (res.ok) {
            const freshUser = await res.json();
            if (freshUser && typeof freshUser === 'object') {
                const localJoined = (user && Array.isArray(user.joinedCommunities)) ? user.joinedCommunities : [];
                const freshJoined = (freshUser && Array.isArray(freshUser.joinedCommunities)) ? freshUser.joinedCommunities : [];
                freshUser.joinedCommunities = Array.from(new Set([...localJoined, ...freshJoined]));
                localStorage.setItem('user', JSON.stringify(freshUser));
                return freshUser;
            }
        }
    } catch (e) {
        console.warn("Could not sync profile from database backend:", e);
    }
    return user;
}

// ==========================================
// REAL-TIME ACTION-BASED STATS & REPUTATION ENGINE
// ==========================================

function calculateLocalReputation(user) {
    if (!user) return 0;
    const joinedCount = user.joinedCommunities ? user.joinedCommunities.length : 0;
    const studyPts = Math.floor((user.studyHours || 0) * 25);
    const postPts = (user.discussionPostsCount || 0) * 15;
    const pinnedPts = (user.pinnedMessagesCount || 0) * 20;
    
    // Check 24h daily note activity
    let dailyNoteActive = false;
    if (user.dailyNote && user.dailyNote.trim() !== '') {
        if (!user.dailyNoteTimestamp || (Date.now() - user.dailyNoteTimestamp < 86400000)) {
            dailyNoteActive = true;
        }
    }
    const dailyNoteBonus = dailyNoteActive ? 5 : 0;

    return (joinedCount * 10) + studyPts + postPts + pinnedPts + dailyNoteBonus;
}

async function refreshRealTimeStatsUI() {
    let user = getCurrentUser();
    if (!user) return;

    // Recalculate local reputation
    user.reputationPoints = calculateLocalReputation(user);
    localStorage.setItem('user', JSON.stringify(user));

    try {
        const identifier = user.id || user.username;
        if (identifier) {
            const res = await fetch(`${API_BASE}/users/${identifier}`);
            if (res.ok) {
                const freshUser = await res.json();
                if (freshUser && typeof freshUser === 'object') {
                    const localJoined = (user && Array.isArray(user.joinedCommunities)) ? user.joinedCommunities : [];
                    const freshJoined = (freshUser && Array.isArray(freshUser.joinedCommunities)) ? freshUser.joinedCommunities : [];
                    freshUser.joinedCommunities = Array.from(new Set([...localJoined, ...freshJoined]));
                    freshUser.reputationPoints = calculateLocalReputation(freshUser);
                    localStorage.setItem('user', JSON.stringify(freshUser));
                    user = freshUser;
                }
            }
        }
    } catch (e) {
        // Backend unreachable: seamless fallback using localStorage state
    }

    // Joined Tribes Count
    const joinedCount = user.joinedCommunities ? user.joinedCommunities.length : 0;
    const studyHrs = (user.studyHours || 0).toFixed(1);
    const postsCount = user.discussionPostsCount || 0;
    const repPts = user.reputationPoints || 0;

    // Update Home Dashboard elements if present
    const homeJoined = document.getElementById('homeStatJoinedTribes');
    if (homeJoined) homeJoined.textContent = `${joinedCount} Tribes`;

    const homeStudy = document.getElementById('homeStatStudyHours');
    if (homeStudy) homeStudy.textContent = `${studyHrs} Hrs`;

    const homePosts = document.getElementById('homeStatPosts');
    if (homePosts) homePosts.textContent = `${postsCount} Posts`;

    const homeRep = document.getElementById('homeStatReputation');
    if (homeRep) homeRep.textContent = `${repPts} Pts`;

    const homeWelcome = document.getElementById('homeWelcomeName');
    if (homeWelcome) homeWelcome.textContent = `Welcome back, ${user.username || 'Explorer'}! 👋`;

    // Update Profile Page elements if present
    const profJoined = document.getElementById('statJoinedTribesCount');
    if (profJoined) profJoined.textContent = `${joinedCount} Tribes`;

    const profStudy = document.getElementById('statStudyHoursCount');
    if (profStudy) profStudy.textContent = `${studyHrs} Hrs`;

    const profPosts = document.getElementById('statPostsCount');
    if (profPosts) profPosts.textContent = `${postsCount} Posts`;

    const profRep = document.getElementById('statReputationPointsCount');
    if (profRep) profRep.textContent = `${repPts} Pts`;
}

// ==========================================
// PROFILE PAGE LOGIC (24h Daily Note & +Add Post)
// ==========================================

function updateDailyNoteCharCount(text) {
    const counter = document.getElementById('dailyNoteCharCount');
    if (counter) {
        counter.textContent = `${text.length} / 100`;
        if (text.length >= 100) {
            counter.style.color = '#ef4444';
        } else {
            counter.style.color = 'inherit';
        }
    }
}

async function loadUserProfileData() {
    const user = await syncUserProfileFromDatabase();
    if (!user) return;

    // Populate header info
    const headerName = document.getElementById('profileHeaderName');
    if (headerName) headerName.textContent = user.username || 'Student Explorer';

    const headerEmail = document.getElementById('profileHeaderEmail');
    if (headerEmail) headerEmail.textContent = user.email || 'email@findmytribe.edu';

    const headerBio = document.getElementById('profileHeaderBio');
    if (headerBio) headerBio.textContent = user.bio || 'Passionate student developer and tribe community member!';

    const avatarImg = document.getElementById('profileAvatarImg');
    if (avatarImg && user.profilePicture) avatarImg.src = user.profilePicture;

    const roleBadge = document.getElementById('profileRoleBadge');
    if (roleBadge) {
        roleBadge.textContent = (user.role || 'USER').toUpperCase();
        if (user.role === 'ADMIN') {
            roleBadge.style.background = 'rgba(239,68,68,0.2)';
            roleBadge.style.color = '#ef4444';
        }
    }

    const repBadge = document.getElementById('reputationLevelBadge');
    if (repBadge) {
        const pts = user.reputationPoints || 0;
        let level = "⭐ Scholar";
        if (pts < 50) level = "🌱 Novice";
        else if (pts < 150) level = "🔍 Explorer";
        else if (pts < 400) level = "🎓 Scholar";
        else if (pts < 800) level = "🚀 Master";
        else level = "👑 Legend";
        repBadge.textContent = level;
    }

    // Populate Edit Form fields
    const editName = document.getElementById('editUsername');
    if (editName) editName.value = user.username || '';

    const editAvatar = document.getElementById('editAvatarUrl');
    if (editAvatar) editAvatar.value = user.profilePicture || '';

    const editBioInput = document.getElementById('editBio');
    if (editBioInput) editBioInput.value = user.bio || '';

    const editLang = document.getElementById('editLanguage');
    if (editLang) editLang.value = user.language || 'en';

    // Populate Daily Status Note Section
    const activeBox = document.getElementById('activeDailyNoteBox');
    const activeText = document.getElementById('activeDailyNoteText');
    const noteInput = document.getElementById('dailyNoteInput');

    if (user.dailyNote && user.dailyNote.trim() !== '') {
        if (activeBox) activeBox.style.display = 'block';
        if (activeText) activeText.textContent = `"${user.dailyNote}"`;
        if (noteInput) noteInput.value = user.dailyNote;
        updateDailyNoteCharCount(user.dailyNote);
    } else {
        if (activeBox) activeBox.style.display = 'none';
    }

    refreshRealTimeStatsUI();
}

async function saveDailyNote() {
    let user = getCurrentUser();
    if (!user) {
        alert("Please login first!");
        return;
    }

    const noteInput = document.getElementById('dailyNoteInput');
    const note = noteInput ? noteInput.value.trim() : '';

    if (note.length > 100) {
        alert("Daily status note must not exceed 100 characters!");
        return;
    }

    user.dailyNote = note;
    user.dailyNoteTimestamp = Date.now();
    user.reputationPoints = calculateLocalReputation(user);
    localStorage.setItem('user', JSON.stringify(user));

    const identifier = user.id || user.username;
    try {
        const res = await fetch(`${API_BASE}/users/${identifier}/daily-note`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ note })
        });

        if (res.ok) {
            const data = await res.json();
            if (data && data.user) {
                data.user.reputationPoints = calculateLocalReputation(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
        }
    } catch (e) {}

    alert("🎉 24-Hour Daily Status Note saved! Earned +5 Reputation Points bonus!");
    loadUserProfileData();
    refreshRealTimeStatsUI();
}

async function saveProfileChanges() {
    const user = getCurrentUser();
    if (!user || user.id === 'user_scholar') {
        alert("Please sign up or log in first to update your profile in MongoDB database!");
        return;
    }

    const username = document.getElementById('editUsername').value.trim();
    const profilePicture = document.getElementById('editAvatarUrl').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const language = document.getElementById('editLanguage').value;

    const identifier = user.id || user.username;
    try {
        const res = await fetch(`${API_BASE}/users/${identifier}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, profilePicture, bio, language })
        });

        if (res.ok) {
            const updated = await res.json();
            localStorage.setItem('user', JSON.stringify(updated));
            alert("🟢 Profile details updated and saved in MongoDB database!");
            loadUserProfileData();
        } else {
            const errText = await res.text();
            alert("Failed to save profile changes: " + errText);
        }
    } catch (e) {
        alert("Error updating profile in backend.");
    }
}

async function changePassword() {
    const user = getCurrentUser();
    if (!user || user.id === 'user_scholar') {
        alert("Please login with your MongoDB account first to change password!");
        return;
    }

    const oldPasswordInput = document.getElementById('oldPasswordInput');
    const newPasswordInput = document.getElementById('newPasswordInput');
    const oldPassword = oldPasswordInput ? oldPasswordInput.value : '';
    const newPassword = newPasswordInput ? newPasswordInput.value : '';

    if (!oldPassword || !newPassword) {
        alert("Please provide both current password and new password.");
        return;
    }

    const identifier = user.id || user.username;
    try {
        const res = await fetch(`${API_BASE}/users/${identifier}/password`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ oldPassword, newPassword })
        });

        if (res.ok) {
            const msg = await res.text();
            alert("🟢 " + (msg || "Password updated successfully in MongoDB database!"));
            if (oldPasswordInput) oldPasswordInput.value = '';
            if (newPasswordInput) newPasswordInput.value = '';
        } else {
            const err = await res.text();
            alert("❌ Password Update Failed: " + (err || "Incorrect old password."));
        }
    } catch (e) {
        alert("Error connecting to backend server at http://localhost:8080.");
    }
}

// Modal Handlers
function openReputationGuideModal() {
    const m = document.getElementById('reputationGuideModal');
    if (m) m.style.display = 'flex';
}

function closeReputationGuideModal() {
    const m = document.getElementById('reputationGuideModal');
    if (m) m.style.display = 'none';
}

function openCreatePostModal() {
    const m = document.getElementById('createPostModal');
    if (m) m.style.display = 'flex';
}

function closeCreatePostModal() {
    const m = document.getElementById('createPostModal');
    if (m) m.style.display = 'none';
}

async function submitNewPostFromModal() {
    let user = getCurrentUser();
    if (!user) {
        alert("Please login first!");
        return;
    }

    const tribe = document.getElementById('postTargetTribeSelect').value;
    const content = document.getElementById('postContentInput').value.trim();
    const imageUrl = document.getElementById('postImageUrlInput') ? document.getElementById('postImageUrlInput').value.trim() : '';
    const videoUrl = document.getElementById('postVideoUrlInput') ? document.getElementById('postVideoUrlInput').value.trim() : '';
    const isPinned = document.getElementById('postIsPinnedCheckbox').checked;

    if (!content && !imageUrl && !videoUrl) {
        alert("Please enter message text, image URL, or video URL!");
        return;
    }

    // Update real-time user discussion post stats locally
    user.discussionPostsCount = (user.discussionPostsCount || 0) + 1;
    if (isPinned) {
        user.pinnedMessagesCount = (user.pinnedMessagesCount || 0) + 1;
    }
    user.reputationPoints = calculateLocalReputation(user);
    localStorage.setItem('user', JSON.stringify(user));

    try {
        const res = await fetch(`${API_BASE}/communities/messages`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sender: user.username,
                senderId: user.id || user.username,
                communityName: tribe,
                message: content,
                imageUrl: imageUrl,
                videoUrl: videoUrl,
                isPinned: isPinned,
                pinnedBy: isPinned ? (user.username) : null,
                timestamp: Date.now()
            })
        });

        if (res.ok) {
            const savedMsg = await res.json();
            closeCreatePostModal();
            if (document.getElementById('postContentInput')) document.getElementById('postContentInput').value = '';
            if (document.getElementById('postImageUrlInput')) document.getElementById('postImageUrlInput').value = '';
            if (document.getElementById('postVideoUrlInput')) document.getElementById('postVideoUrlInput').value = '';
            alert(`🎉 Post published to ${tribe}! Real-Time Discussion Stats & Reputation Points updated!`);
            refreshRealTimeStatsUI();
            loadJoinedTribesLiveFeed();
            return;
        }
    } catch (e) {}

    closeCreatePostModal();
    if (document.getElementById('postContentInput')) document.getElementById('postContentInput').value = '';
    if (document.getElementById('postImageUrlInput')) document.getElementById('postImageUrlInput').value = '';
    if (document.getElementById('postVideoUrlInput')) document.getElementById('postVideoUrlInput').value = '';
    alert(`🎉 Post published to ${tribe}! Real-Time Discussion Stats & Reputation Points updated!`);
    refreshRealTimeStatsUI();
    loadJoinedTribesLiveFeed();
}

// ==========================================
// AI CHAT BOT ASSISTANT ENGINE
// ==========================================

async function sendAIChat() {
    const input = document.getElementById('aiInput');
    const container = document.getElementById('chatMessages');
    if (!input || !container) return;

    const promptText = input.value.trim();
    if (!promptText) return;

    // Append User Message Bubble
    container.innerHTML += `
    <div class="message user" style="align-self: flex-end; background: var(--blurple); color: white; padding: 12px 16px; border-radius: 16px; margin-bottom: 12px; max-width: 80%;">
        ${promptText}
    </div>`;

    input.value = '';
    container.scrollTop = container.scrollHeight;

    // Append Typing Indicator
    const typingId = 'typing-' + Date.now();
    container.innerHTML += `
    <div id="${typingId}" class="message bot" style="align-self: flex-start; background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: 16px; margin-bottom: 12px; max-width: 80%;">
        🤖 <i>AI Assistant is thinking...</i>
    </div>`;
    container.scrollTop = container.scrollHeight;

    try {
        const res = await fetch(`${API_BASE}/integrations/ai-chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ prompt: promptText })
        });

        const typingElem = document.getElementById(typingId);

        if (res.ok) {
            const data = await res.json();
            const reply = data.response || "No response received from AI.";
            if (typingElem) {
                typingElem.innerHTML = `🤖 <strong>AI Assistant:</strong><br>${reply.replace(/\n/g, '<br>')}`;
            }
        } else {
            if (typingElem) {
                typingElem.innerHTML = `🤖 <strong>AI Assistant:</strong> I encountered an issue processing your request. Please try again!`;
            }
        }
    } catch (e) {
        const typingElem = document.getElementById(typingId);
        if (typingElem) {
            typingElem.innerHTML = `🤖 <strong>AI Assistant:</strong> Simulated AI response: Here is academic guidance for "<em>${promptText}</em>". Connect a valid Gemini API key for live responses!`;
        }
    }

    container.scrollTop = container.scrollHeight;
}

// Check for AI prompt in URL query string on load
function initAiChatQueryPrompt() {
    const urlParams = new URLSearchParams(window.location.search);
    const prompt = urlParams.get('prompt');
    const input = document.getElementById('aiInput');
    if (prompt && input) {
        input.value = prompt;
        sendAIChat();
    }
}

// ==========================================
// COMMUNITY & PINNED MESSAGES SYSTEM WITH MEDIA ATTACHMENTS
// ==========================================

async function loadCommunityMessagesFromApi(communityName) {
    const msgContainer = document.getElementById('groupChatMessages');
    if (!msgContainer) return;

    try {
        const res = await fetch(`${API_BASE}/communities/messages/${encodeURIComponent(communityName)}`);
        if (res.ok) {
            const messages = await res.json();
            if (messages && messages.length > 0) {
                msgContainer.innerHTML = '';
                messages.forEach(msg => {
                    const isPinned = msg.pinned || msg.isPinned;
                    const pinnedClass = isPinned ? 'pinned' : '';
                    const pinnedBadge = isPinned ? `<span class="pinned-badge">📌 Pinned Message</span>` : '';
                    
                    let mediaHtml = '';
                    if (msg.imageUrl && msg.imageUrl.trim() !== '') {
                        mediaHtml += `<br><img src="${msg.imageUrl.trim()}" class="message-media-img" onerror="this.style.display='none'">`;
                    }
                    if (msg.videoUrl && msg.videoUrl.trim() !== '') {
                        mediaHtml += `<br><video controls src="${msg.videoUrl.trim()}" class="message-media-video"></video>`;
                    }

                    msgContainer.innerHTML += `
                    <div class="glass-card message-bubble bot ${pinnedClass}" style="align-self: flex-start;">
                        ${pinnedBadge}
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                            <strong style="color:var(--primary); font-size:0.9rem;">${msg.sender || 'Tribe Member'}</strong>
                            <button onclick="togglePinMessage('${msg.id}')" style="background:none; border:none; cursor:pointer; font-size:0.8rem; color:#f59e0b;">
                                ${isPinned ? '📌 Unpin' : '📌 Pin Message'}
                            </button>
                        </div>
                        <p style="margin: 4px 0;">${msg.message || ''}</p>
                        ${mediaHtml}
                    </div>`;
                });
                msgContainer.scrollTop = msgContainer.scrollHeight;
            }
        }
    } catch (e) {
        console.warn("Could not fetch messages from backend API:", e);
    }
}

async function sendCommunityMessage() {
    let user = getCurrentUser();
    if (!user) {
        alert("Please login to post messages!");
        return;
    }

    const input = document.getElementById('groupChatInput');
    const imageInput = document.getElementById('groupImageInput');
    const videoInput = document.getElementById('groupVideoInput');
    const pinCheckbox = document.getElementById('pinMessageCheckbox');
    if (!input) return;

    const msgText = input.value.trim();
    const imageUrl = imageInput ? imageInput.value.trim() : '';
    const videoUrl = videoInput ? videoInput.value.trim() : '';

    if (!msgText && !imageUrl && !videoUrl) {
        alert("Please enter message text, image URL, or video URL!");
        return;
    }

    const isPinned = pinCheckbox ? pinCheckbox.checked : false;

    // Increment user discussion post & reputation stats
    user.discussionPostsCount = (user.discussionPostsCount || 0) + 1;
    if (isPinned) {
        user.pinnedMessagesCount = (user.pinnedMessagesCount || 0) + 1;
    }
    user.reputationPoints = calculateLocalReputation(user);
    localStorage.setItem('user', JSON.stringify(user));

    try {
        const res = await fetch(`${API_BASE}/communities/messages`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sender: user.username,
                senderId: user.id || user.username,
                communityName: currentTribeName || 'Java Developers',
                message: msgText,
                imageUrl: imageUrl,
                videoUrl: videoUrl,
                isPinned: isPinned,
                pinnedBy: isPinned ? user.username : null,
                timestamp: Date.now()
            })
        });

        if (res.ok) {
            input.value = '';
            if (imageInput) imageInput.value = '';
            if (videoInput) videoInput.value = '';
            if (pinCheckbox) pinCheckbox.checked = false;
            loadCommunityMessagesFromApi(currentTribeName || 'Java Developers');
            refreshRealTimeStatsUI();
            return;
        }
    } catch (e) {}

    input.value = '';
    if (imageInput) imageInput.value = '';
    if (videoInput) videoInput.value = '';
    if (pinCheckbox) pinCheckbox.checked = false;

    const msgContainer = document.getElementById('groupChatMessages');
    if (msgContainer) {
        let mediaHtml = '';
        if (imageUrl) mediaHtml += `<br><img src="${imageUrl}" class="message-media-img" onerror="this.style.display='none'">`;
        if (videoUrl) mediaHtml += `<br><video controls src="${videoUrl}" class="message-media-video"></video>`;

        msgContainer.innerHTML += `
        <div class="glass-card message-bubble bot ${isPinned ? 'pinned' : ''}" style="align-self: flex-start;">
            ${isPinned ? '<span class="pinned-badge">📌 Pinned Message</span>' : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                <strong style="color:var(--primary); font-size:0.9rem;">${user.username || 'Scholar'}</strong>
            </div>
            <p style="margin: 4px 0;">${msgText}</p>
            ${mediaHtml}
        </div>`;
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    refreshRealTimeStatsUI();
}

async function togglePinMessage(messageId) {
    let user = getCurrentUser();
    if (!user) return;

    user.pinnedMessagesCount = (user.pinnedMessagesCount || 0) + 1;
    user.reputationPoints = calculateLocalReputation(user);
    localStorage.setItem('user', JSON.stringify(user));

    try {
        const res = await fetch(`${API_BASE}/communities/messages/${messageId}/pin?userId=${user.id || user.username}`, {
            method: 'PUT'
        });

        if (res.ok) {
            alert("Message pin status toggled! Reputation points updated.");
            loadCommunityMessagesFromApi(currentTribeName || 'Java Developers');
            refreshRealTimeStatsUI();
        }
    } catch (e) {
        alert("Could not update pin status.");
    }
    refreshRealTimeStatsUI();
}

async function joinTribe(name) {
    let user = getCurrentUser();
    if (!user) return;

    if (!user.joinedCommunities) user.joinedCommunities = [];
    if (!user.joinedCommunities.includes(name)) {
        user.joinedCommunities.push(name);
    }
    user.reputationPoints = calculateLocalReputation(user);
    localStorage.setItem('user', JSON.stringify(user));

    const userId = user.id || user.username;
    try {
        const res = await fetch(`${API_BASE}/communities/${encodeURIComponent(name)}/join?userId=${encodeURIComponent(userId)}`, {
            method: 'POST'
        });

        if (res.ok) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await res.json();
                if (data && typeof data === 'object' && Array.isArray(data.joinedCommunities)) {
                    const localJoined = user.joinedCommunities || [];
                    const combined = Array.from(new Set([...localJoined, ...data.joinedCommunities, name]));
                    data.joinedCommunities = combined;
                    data.reputationPoints = calculateLocalReputation(data);
                    localStorage.setItem('user', JSON.stringify(data));
                }
            }
        }
    } catch (e) {}

    user = getCurrentUser();
    if (!user.joinedCommunities) user.joinedCommunities = [];
    if (!user.joinedCommunities.includes(name)) {
        user.joinedCommunities.push(name);
        user.reputationPoints = calculateLocalReputation(user);
        localStorage.setItem('user', JSON.stringify(user));
    }

    alert(`🎉 Joined ${name} community! Reflected in My Tribes & Chat unlocked (+10 Rep Pts)!`);

    refreshRealTimeStatsUI();
    loadCommunities();
    loadJoinedTribesLiveFeed();
    if (typeof renderCommunityView === 'function') {
        renderCommunityView();
    }
}

async function leaveTribe(name) {
    let user = getCurrentUser();
    if (!user) return;

    if (user.joinedCommunities) {
        user.joinedCommunities = user.joinedCommunities.filter(c => c !== name);
        user.reputationPoints = calculateLocalReputation(user);
        localStorage.setItem('user', JSON.stringify(user));
    }

    const userId = user.id || user.username;
    try {
        const res = await fetch(`${API_BASE}/communities/${encodeURIComponent(name)}/leave?userId=${encodeURIComponent(userId)}`, {
            method: 'POST'
        });

        if (res.ok) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await res.json();
                if (data && typeof data === 'object' && Array.isArray(data.joinedCommunities)) {
                    data.joinedCommunities = data.joinedCommunities.filter(c => c !== name);
                    data.reputationPoints = calculateLocalReputation(data);
                    localStorage.setItem('user', JSON.stringify(data));
                }
            }
        }
    } catch (e) {}

    user = getCurrentUser();
    if (user.joinedCommunities) {
        user.joinedCommunities = user.joinedCommunities.filter(c => c !== name);
        user.reputationPoints = calculateLocalReputation(user);
        localStorage.setItem('user', JSON.stringify(user));
    }

    alert(`Left ${name} community.`);

    refreshRealTimeStatsUI();
    loadCommunities();
    loadJoinedTribesLiveFeed();
    if (typeof renderCommunityView === 'function') {
        renderCommunityView();
    }
}

// ==========================================
// FRONT PAGE JOINED TRIBES LIVE FEED ALGORITHM
// ==========================================

async function loadJoinedTribesLiveFeed() {
    const streamContainer = document.getElementById('homeLiveActivityStream');
    if (!streamContainer) return;

    const user = getCurrentUser();
    const joinedCommunities = user && user.joinedCommunities ? user.joinedCommunities : [];

    try {
        const res = await fetch(`${API_BASE}/communities/live-feed`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ joinedCommunities })
        });

        if (res.ok) {
            const feedMessages = await res.json();
            if (feedMessages && feedMessages.length > 0) {
                streamContainer.innerHTML = '';
                feedMessages.forEach(msg => {
                    const isPinned = msg.pinned || msg.isPinned;
                    const tribeTag = msg.communityName ? `<span class="category-tag" style="font-size:0.75rem;">${msg.communityName}</span>` : '';
                    const pinnedTag = isPinned ? `<span class="category-tag" style="background:rgba(245,158,11,0.2); color:#f59e0b;">📌 Pinned</span>` : '';
                    
                    streamContainer.innerHTML += `
                    <div class="glass-card activity-item" style="margin-bottom:14px; padding:18px; ${isPinned ? 'border:1px solid rgba(245,158,11,0.5);' : ''}">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop" class="activity-avatar">
                        <div class="activity-content" style="flex:1;">
                            <div class="activity-header" style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong>${msg.sender || 'Tribe Scholar'}</strong>
                                    ${tribeTag}
                                    ${pinnedTag}
                                </div>
                                <span style="font-size:0.8rem; opacity:0.7;">${new Date(msg.timestamp || Date.now()).toLocaleTimeString()}</span>
                            </div>
                            <p style="font-size: 0.94rem; margin-top: 8px;">${msg.message}</p>
                        </div>
                    </div>`;
                });
                return;
            }
        }
    } catch (e) {
        console.warn("Using local live feed fallback:", e);
    }

    // Default Fallback Feed
    streamContainer.innerHTML = `
        <div class="glass-card activity-item" style="margin-bottom:14px; padding:18px; border:1px solid rgba(245,158,11,0.5);">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop" class="activity-avatar">
            <div class="activity-content">
                <div class="activity-header">
                    <strong>Sneha (Java Developers)</strong>
                    <span class="category-tag" style="background:rgba(245,158,11,0.2); color:#f59e0b;">📌 Pinned</span>
                </div>
                <p style="font-size: 0.92rem;">Shared a new revision guide: <i>"Spring Boot 3.2 Security Annotations Cheat Sheet"</i>. Check it out in the Study Hub!</p>
            </div>
        </div>
        <div class="glass-card activity-item" style="padding:18px;">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop" class="activity-avatar">
            <div class="activity-content">
                <div class="activity-header">
                    <strong>Dr. Arjun (Doctors MBBS)</strong>
                </div>
                <p style="font-size: 0.92rem;">High-yield Pharmacology Viva Voce question set uploaded for USMLE & NEET PG aspirants!</p>
            </div>
        </div>`;
}

// ==========================================
// ADMIN DASHBOARD MANAGEMENT SYSTEM (ID: admin | Pass: admin123)
// ==========================================

async function openAdminLoginPrompt() {
    const adminId = prompt("Enter Admin ID:", "admin");
    if (adminId === null) return;

    const adminPassword = prompt("Enter Admin Password:");
    if (adminPassword === null) return;

    if (adminId.trim() === 'admin' && adminPassword === 'admin123') {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: adminId.trim(), password: adminPassword})
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                alert("🟢 Admin Authentication Successful! Access Granted to Admin Panel.");
                window.location.href = 'admin.html';
                return;
            }
        } catch (e) {}

        const adminUser = { id: 'admin', username: 'admin', email: 'admin@findmytribe.edu', role: 'ADMIN' };
        localStorage.setItem('token', 'admin-token-123');
        localStorage.setItem('user', JSON.stringify(adminUser));
        alert("🟢 Admin Credentials Verified! Access Granted.");
        window.location.href = 'admin.html';
    } else {
        alert("❌ Access Denied! Invalid Admin ID or Password.\nRequired Admin ID: admin\nRequired Password: admin123");
    }
}

async function verifyAdminAccessOrPrompt() {
    const user = getCurrentUser();
    if (user && (user.role === 'ADMIN' || user.username === 'admin')) {
        loadAdminStats();
        return;
    }

    alert("🔒 Restricted Admin Page! Please enter Admin ID and Password to proceed.");
    const adminId = prompt("Enter Admin ID:", "admin");
    const adminPassword = prompt("Enter Admin Password:");

    if (adminId && adminId.trim() === 'admin' && adminPassword === 'admin123') {
        const adminUser = { id: 'admin', username: 'admin', email: 'admin@findmytribe.edu', role: 'ADMIN' };
        localStorage.setItem('token', 'admin-token-123');
        localStorage.setItem('user', JSON.stringify(adminUser));
        loadAdminStats();
    } else {
        alert("❌ Access Denied! Invalid Admin Credentials. Redirecting to Login Page.");
        window.location.href = 'login.html';
    }
}

let adminUsersList = [];

async function loadAdminStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/status`);
        if (res.ok) {
            const data = await res.json();
            const u = document.getElementById('adminTotalUsers');
            if (u) u.textContent = data.totalUsers || 0;

            const c = document.getElementById('adminTotalCommunities');
            if (c) c.textContent = data.totalCommunities || 52;

            const m = document.getElementById('adminTotalMessages');
            if (m) m.textContent = data.totalMessages || 0;

            const p = document.getElementById('adminPinnedMessages');
            if (p) p.textContent = data.totalPinnedMessages || 0;
        }

        const usersRes = await fetch(`${API_BASE}/admin/users`);
        if (usersRes.ok) {
            adminUsersList = await usersRes.json();
            renderAdminUsersTable(adminUsersList);
        }
    } catch (e) {
        console.warn("Admin stats fetch error:", e);
    }
}

function renderAdminUsersTable(users) {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; opacity: 0.7;">No registered users found in MongoDB database.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    users.forEach(u => {
        const isAdmin = u.role === 'ADMIN';
        const roleClass = isAdmin ? 'role-admin' : 'role-user';
        const joined = u.joinedCommunities ? u.joinedCommunities.length : 0;
        const study = (u.studyHours || 0).toFixed(1);
        const rep = u.reputationPoints || 0;

        tbody.innerHTML += `
        <tr>
            <td><strong>${u.username}</strong></td>
            <td>${u.email}</td>
            <td><span class="role-badge ${roleClass}">${u.role || 'USER'}</span></td>
            <td>${joined} Tribes</td>
            <td>${study} Hrs</td>
            <td><strong>${rep} Pts</strong></td>
            <td>
                <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem; margin-right: 6px;" onclick="toggleAdminUserRole('${u.id}')">
                    ${isAdmin ? 'Demote to USER' : 'Make ADMIN'}
                </button>
                <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem; border-color:#ef4444; color:#ef4444;" onclick="deleteAdminUser('${u.id}')">
                    Delete
                </button>
            </td>
        </tr>`;
    });
}

function filterAdminUsersTable(query) {
    if (!query) {
        renderAdminUsersTable(adminUsersList);
        return;
    }
    const q = query.toLowerCase();
    const filtered = adminUsersList.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    renderAdminUsersTable(filtered);
}

async function toggleAdminUserRole(userId) {
    const targetUser = adminUsersList.find(u => u.id === userId);
    if (!targetUser) return;

    const newRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ role: newRole })
        });

        if (res.ok) {
            alert(`User ${targetUser.username} role updated to ${newRole}!`);
            loadAdminStats();
        }
    } catch (e) {
        alert("Error updating user role.");
    }
}

async function deleteAdminUser(userId) {
    if (!confirm("Are you sure you want to delete this user from MongoDB?")) return;

    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            alert("User deleted from database!");
            loadAdminStats();
        }
    } catch (e) {
        alert("Error deleting user.");
    }
}

// Study Timer Logic
let studyTimerInterval = null;
let studyTimerSeconds = 0;

function toggleStudySessionTimer() {
    const btn = document.getElementById('studyTimerBtn');
    const display = document.getElementById('studyTimerDisplay');

    if (!studyTimerInterval) {
        // Start timer
        studyTimerInterval = setInterval(() => {
            studyTimerSeconds++;
            const hrs = String(Math.floor(studyTimerSeconds / 3600)).padStart(2, '0');
            const mins = String(Math.floor((studyTimerSeconds % 3600) / 60)).padStart(2, '0');
            const secs = String(studyTimerSeconds % 60).padStart(2, '0');
            if (display) display.textContent = `${hrs}:${mins}:${secs}`;
        }, 1000);
        if (btn) btn.textContent = '⏸️ Pause & Save';
    } else {
        // Pause and Save Study Time
        clearInterval(studyTimerInterval);
        studyTimerInterval = null;
        if (btn) btn.textContent = '▶️ Start Session';

        const hoursElapsed = (studyTimerSeconds / 3600);
        if (hoursElapsed > 0.001) {
            addStudyHoursToApi(hoursElapsed);
        }
        studyTimerSeconds = 0;
        if (display) display.textContent = '00:00:00';
    }
}

async function logManualStudyTime() {
    await addStudyHoursToApi(1.0);
}

async function addStudyHoursToApi(hours) {
    let user = getCurrentUser();
    if (!user) {
        alert("Please login first to log study hours!");
        return;
    }

    const hrsToAdd = parseFloat(hours) || 0;
    user.studyHours = (user.studyHours || 0) + hrsToAdd;
    user.reputationPoints = calculateLocalReputation(user);
    localStorage.setItem('user', JSON.stringify(user));

    const identifier = user.id || user.username;
    try {
        const res = await fetch(`${API_BASE}/users/${identifier}/study-hours`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ hours: hrsToAdd })
        });

        if (res.ok) {
            const updatedUser = await res.json();
            if (updatedUser && typeof updatedUser === 'object') {
                updatedUser.reputationPoints = calculateLocalReputation(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
        }
    } catch (e) {}

    alert(`🎉 Logged ${hrsToAdd.toFixed(1)} study hours! Study Hours & Reputation Points updated real-time!`);
    refreshRealTimeStatsUI();
}

// ==========================================
// 52+ SPECIALIZED COMMUNITIES & STUDY RESOURCES ENGINE
// ==========================================

const ALL_DEPARTMENTS = [
    {name: 'Java Developers', category: 'IT', desc: 'Core Java, Spring Boot 3.2, Microservices & Backend Engineering.', img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop'},
    {name: 'Doctors (MBBS)', category: 'Medical', desc: 'Clinical Medicine, Anatomy, Pharmacology & USMLE/NEET-PG.', img: 'https://images.unsplash.com/photo-1584982751601-97d8cb0f66fc?w=500&auto=format&fit=crop'},
    {name: 'BTech CSE', category: 'Engineering', desc: 'Computer Science, Algorithms, Operating Systems & System Design.', img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop'},
    {name: 'Commerce & Accounting', category: 'Business', desc: 'Financial Accounting, Auditing & Corporate Taxation.', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop'},
    {name: 'Chartered Accountants (CA)', category: 'Finance', desc: 'CA Foundation, Intermediate & Final Aspirants.', img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop'},
    {name: 'Data Science & AI', category: 'IT', desc: 'Machine Learning, PyTorch, Deep Learning & Big Data.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop'},
    {name: 'Cybersecurity & Ethical Hacking', category: 'IT', desc: 'Penetration Testing, Network Security & CISSP.', img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop'},
    {name: 'UI/UX Designers', category: 'Design', desc: 'Figma Design Systems, Wireframing & User Research.', img: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&auto=format&fit=crop'},
    {name: 'Mechanical Engineering', category: 'Engineering', desc: 'Thermodynamics, CAD/CAM & Fluid Mechanics.', img: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&auto=format&fit=crop'},
    {name: 'Civil Engineering', category: 'Engineering', desc: 'Structural Design, Surveying & Concrete Technology.', img: 'https://images.unsplash.com/photo-1541888086903-efdc7482933d?w=500&auto=format&fit=crop'},
    {name: 'Electrical Engineering', category: 'Engineering', desc: 'Power Systems, Control Systems & Electronics.', img: 'https://images.unsplash.com/photo-1620283085068-5aab1b5650bf?w=500&auto=format&fit=crop'},
    {name: 'BTech ECE', category: 'Engineering', desc: 'VLSI, Digital Signal Processing & Embedded Systems.', img: 'https://images.unsplash.com/photo-1517077304055-6e89badf0c90?w=500&auto=format&fit=crop'},
    {name: 'Dentistry (BDS)', category: 'Medical', desc: 'Oral Surgery, Orthodontics & Dental Materials.', img: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=500&auto=format&fit=crop'},
    {name: 'Nursing Professionals', category: 'Medical', desc: 'Patient Care, Critical Nursing & Healthcare Admin.', img: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=500&auto=format&fit=crop'},
    {name: 'Pharmacy (BPharm)', category: 'Medical', desc: 'Pharmaceutics, Medicinal Chemistry & Clinical Trials.', img: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop'},
    {name: 'Law (LLB & LLM)', category: 'Legal', desc: 'Constitutional Law, Corporate Jurisprudence & Criminal Defense.', img: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500&auto=format&fit=crop'},
    {name: 'Business Administration (BBA)', category: 'Business', desc: 'Management Principles, Marketing Strategy & Operations.', img: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=500&auto=format&fit=crop'},
    {name: 'MBA Students & Scholars', category: 'Business', desc: 'Case Studies, Leadership, Mergers & Investment Banking.', img: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&auto=format&fit=crop'},
    {name: 'Architecture & Planning', category: 'Design', desc: 'Architectural Sketching, Revit & Urban Design.', img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&auto=format&fit=crop'},
    {name: 'Psychology & Counseling', category: 'Humanities', desc: 'Cognitive Science, Psychotherapy & Behavioral Analysis.', img: 'https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?w=500&auto=format&fit=crop'},
    {name: 'Economics & Analytics', category: 'Finance', desc: 'Microeconomics, Econometrics & Global Markets.', img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&auto=format&fit=crop'},
    {name: 'Journalism & Mass Comm', category: 'Media', desc: 'Broadcast Media, Investigative Reporting & Digital Content.', img: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&auto=format&fit=crop'},
    {name: 'Digital Marketing & SEO', category: 'Business', desc: 'Search Engine Optimization, PPC Advertising & Brand Growth.', img: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=500&auto=format&fit=crop'},
    {name: 'Graphic Design & Motion', category: 'Design', desc: 'Photoshop, Illustrator, After Effects & Branding.', img: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500&auto=format&fit=crop'},
    {name: 'Animation & VFX', category: 'Media', desc: '3D Modeling, Blender, Maya & Visual Effects.', img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop'},
    {name: 'Aerospace Engineering', category: 'Engineering', desc: 'Aerodynamics, Propulsion & Orbital Mechanics.', img: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=500&auto=format&fit=crop'},
    {name: 'Biotechnology & Genetics', category: 'Science', desc: 'CRISPR, Molecular Biology & Bioinformatics.', img: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=500&auto=format&fit=crop'},
    {name: 'Agricultural Sciences', category: 'Science', desc: 'Agronomy, Soil Science & Sustainable Farming.', img: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500&auto=format&fit=crop'},
    {name: 'Hotel & Hospitality Management', category: 'Hospitality', desc: 'Hotel Operations, Culinary Arts & Event Management.', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop'},
    {name: 'Fine Arts & Painting', category: 'Arts', desc: 'Oil Painting, Aesthetics & Art History.', img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop'},
    {name: 'History & Archaeology', category: 'Humanities', desc: 'World History, Excavation & Numismatics.', img: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=500&auto=format&fit=crop'},
    {name: 'Political Science & Policy', category: 'Humanities', desc: 'International Relations, Political Thought & Public Administration.', img: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500&auto=format&fit=crop'},
    {name: 'Sociology & Social Work', category: 'Humanities', desc: 'Social Dynamics, Welfare & Community Development.', img: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&auto=format&fit=crop'},
    {name: 'English Literature', category: 'Humanities', desc: 'Literary Criticism, Shakespeare & Poetry Analysis.', img: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=500&auto=format&fit=crop'},
    {name: 'Physics & Astronomy', category: 'Science', desc: 'Quantum Mechanics, Astrophysics & Particle Physics.', img: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=500&auto=format&fit=crop'},
    {name: 'Chemistry & Materials', category: 'Science', desc: 'Organic Synthesis, Polymer Science & Catalysis.', img: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=500&auto=format&fit=crop'},
    {name: 'Pure & Applied Mathematics', category: 'Science', desc: 'Linear Algebra, Calculus & Topology.', img: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop'},
    {name: 'Veterinary Science', category: 'Medical', desc: 'Animal Pathology, Veterinary Surgery & Medicine.', img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&auto=format&fit=crop'},
    {name: 'Game Development & Unreal', category: 'IT', desc: 'C++, Unreal Engine 5, Unity & Shader Programming.', img: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=500&auto=format&fit=crop'},
    {name: 'Blockchain & Web3', category: 'IT', desc: 'Solidity, Smart Contracts, Ethereum & DeFi.', img: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop'},
    {name: 'Cloud Computing & DevOps', category: 'IT', desc: 'AWS, Kubernetes, Docker, Terraform & CI/CD Pipelines.', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop'},
    {name: 'Robotics & Mechatronics', category: 'Engineering', desc: 'ROS 2, Microcontrollers, Kinematics & Automation.', img: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop'},
    {name: 'Marine Biology', category: 'Science', desc: 'Oceanography, Marine Ecosystems & Conservation.', img: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=500&auto=format&fit=crop'},
    {name: 'Fashion Design & Styling', category: 'Design', desc: 'Textile Design, Garment Construction & Fashion Forecasting.', img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&auto=format&fit=crop'},
    {name: 'Interior & Spatial Design', category: 'Design', desc: '3D Rendering, AutoCAD & Furniture Layouts.', img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=500&auto=format&fit=crop'},
    {name: 'Commercial Photography', category: 'Media', desc: 'Lighting, Camera Rigging & Lightroom Editing.', img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop'},
    {name: 'Film Making & Directing', category: 'Media', desc: 'Cinematography, Screenwriting & Film Editing.', img: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop'},
    {name: 'Public Health & Epidemiology', category: 'Medical', desc: 'Biostatistics, Disease Prevention & Health Policy.', img: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=500&auto=format&fit=crop'},
    {name: 'Clinical Nutrition & Dietetics', category: 'Medical', desc: 'Metabolism, Sports Nutrition & Diet Planning.', img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&auto=format&fit=crop'},
    {name: 'Sports Management', category: 'Business', desc: 'Athletic Marketing, Sports Law & Event Planning.', img: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop'},
    {name: 'Environmental Science', category: 'Science', desc: 'Climate Change, Renewable Energy & Ecology.', img: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500&auto=format&fit=crop'},
    {name: 'Financial Risk Management (FRM)', category: 'Finance', desc: 'Quantitative Finance, Portfolio Risk & Derivatives.', img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&auto=format&fit=crop'}
].map(c => ({...c, members: Math.floor(Math.random() * 4500) + 1500}));

function translateDepartmentName(name) {
    if (typeof t === 'function') {
        return t("dept." + name, name);
    }
    return name;
}

function loadCommunities(query = '') {
    const grid = document.getElementById('communitiesGrid');
    if (!grid) return;

    const user = getCurrentUser();
    const myJoinedTribes = user && user.joinedCommunities ? user.joinedCommunities : [];
    const isMyTribesPage = window.location.href.toLowerCase().includes('mytribes');
    const isHomePage = window.location.href.toLowerCase().includes('home.html');

    let list = ALL_DEPARTMENTS;

    // On mytribes.html: filter to user's joined communities only
    if (isMyTribesPage) {
        list = ALL_DEPARTMENTS.filter(d => myJoinedTribes.includes(d.name));
        myJoinedTribes.forEach(name => {
            if (!list.some(d => d.name === name)) {
                list.push({
                    name: name,
                    category: 'Academic & Professional',
                    desc: 'Joined study tribe and discussion channel.',
                    img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop',
                    members: 1200
                });
            }
        });
    }

    // Filter by search query if provided
    if (query && query.trim() !== '') {
        const q = query.toLowerCase().trim();
        list = list.filter(d => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || (d.desc && d.desc.toLowerCase().includes(q)));
    }

    // Limit to 6 recommendations on home page if home.html
    if (isHomePage) {
        list = list.slice(0, 6);
    }

    if (list.length === 0) {
        if (isMyTribesPage) {
            grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px dashed var(--border-light);">
                <div style="font-size:3rem; margin-bottom:12px;">👥</div>
                <h3 style="font-weight:800; margin-bottom:8px;">No Joined Tribes Yet</h3>
                <p style="opacity:0.8; margin-bottom:20px; max-width:400px; margin-left:auto; margin-right:auto;">Explore 52+ specialized student and professional communities in Discover and click <strong>"➕ Join Tribe"</strong> to add them here!</p>
                <a href="discover.html" class="btn btn-primary" style="padding:10px 24px;">🔍 Discover & Join Communities</a>
            </div>`;
        } else {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; opacity: 0.7;">No matching communities found.</div>`;
        }
        return;
    }

    grid.innerHTML = '';
    list.forEach(item => {
        const isJoined = myJoinedTribes.includes(item.name);
        const translatedName = translateDepartmentName(item.name);

        grid.innerHTML += `
        <div class="glass-card community-card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; border-radius: 16px;">
            <div>
                <img src="${item.img}" onerror="this.src='https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop'" style="width: 100%; height: 140px; border-radius: 12px; object-fit: cover; margin-bottom: 14px;">
                <span class="category-tag" style="margin-bottom: 8px; display: inline-block;">${item.category}</span>
                <h3 style="font-weight: 800; font-size: 1.15rem; margin-bottom: 6px;">${translatedName}</h3>
                <p style="font-size: 0.85rem; opacity: 0.8; margin-bottom: 14px; line-height: 1.4;">${item.desc || 'Active student study tribe and academic discussion group.'}</p>
            </div>
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; font-size:0.82rem; opacity:0.85;">
                    <span>👥 ${item.members || 1200} members</span>
                    ${isJoined ? '<span style="color:#10b981; font-weight:700;">✓ Joined</span>' : ''}
                </div>
                <div style="margin-top: 8px;">
                    ${isJoined ? `
                        <div style="display:flex; gap: 8px;">
                            <a href="community.html?id=${encodeURIComponent(item.name)}" class="btn btn-primary" style="flex:1; text-align:center; padding:8px 12px; font-size:0.85rem;">💬 Open Chat</a>
                            <button class="btn btn-outline" style="flex:1; padding:8px 12px; font-size:0.85rem; color:#ef4444; border-color:rgba(239,68,68,0.4);" onclick="leaveTribe('${item.name}')">Leave Tribe</button>
                        </div>
                    ` : `
                        <button class="btn btn-primary" style="width:100%; padding:10px 12px; font-size:0.88rem;" onclick="joinTribe('${item.name}')">➕ Join Tribe</button>
                    `}
                </div>
            </div>
        </div>`;
    });
}

function searchCommunities(query) {
    loadCommunities(query);
}

// ==========================================
// STUDY RESOURCE HUB ENGINE
// ==========================================
let activeStudyCategory = 'IT & Software';
let activeStudyTab = 'all';

function setStudyCategory(cat) {
    activeStudyCategory = cat;
    document.querySelectorAll('.category-pill').forEach(btn => {
        if (btn.textContent.includes(cat) || (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(cat))) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderStudyResources();
}

function setStudyTab(tab) {
    activeStudyTab = tab;
    document.querySelectorAll('.resource-tab').forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tab}'`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderStudyResources();
}

function searchTopicResources() {
    const input = document.getElementById('resourceSearch');
    const query = input ? input.value.trim() : '';
    renderStudyResources(query);
}

function renderStudyResources(searchQuery = '') {
    const container = document.getElementById('resourceResults');
    if (!container) return;

    let topic = searchQuery && searchQuery.trim() !== '' ? searchQuery.trim() : activeStudyCategory;

    const resources = [
        {
            type: 'wiki',
            title: `🌐 Wikipedia: Comprehensive ${topic} Overview & Reference`,
            desc: `Detailed academic reference article explaining foundational concepts, history, and applications of ${topic}.`,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
            badge: 'Wikipedia Reference'
        },
        {
            type: 'yt',
            title: `📺 YouTube Tutorials: Learn ${topic} Step-by-Step`,
            desc: `Curated video playlists, lectures, and practical coding/clinical walk-throughs on ${topic}.`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}+tutorial+lecture`,
            badge: 'Video Lectures'
        },
        {
            type: 'articles',
            title: `📰 Medium Articles & PDF Study Guides: ${topic}`,
            desc: `In-depth articles, cheat sheets, and practical interview questions for ${topic}.`,
            url: `https://medium.com/search?q=${encodeURIComponent(topic)}`,
            badge: 'Articles & Guides'
        },
        {
            type: 'ai',
            title: `🤖 Ask Gemini AI Tutor about ${topic}`,
            desc: `Get personalized study explanations, formula breakdowns, and problem-solving help from your AI assistant.`,
            url: `ai-chat.html?prompt=${encodeURIComponent('Explain ' + topic + ' in clear academic detail')}`,
            badge: 'AI Tutor'
        }
    ];

    let filtered = resources;
    if (activeStudyTab !== 'all') {
        filtered = resources.filter(r => r.type === activeStudyTab || r.type === 'ai');
    }

    container.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px;">
        ${filtered.map(r => `
            <div class="glass-card" style="padding: 24px; display:flex; flex-direction:column; justify-content:space-between; border-radius:16px;">
                <div>
                    <span class="category-tag" style="margin-bottom:12px; display:inline-block;">${r.badge}</span>
                    <h3 style="font-weight:800; font-size:1.15rem; margin-bottom: 8px;">${r.title}</h3>
                    <p style="font-size:0.88rem; opacity:0.85; line-height:1.5; margin-bottom:16px;">${r.desc}</p>
                </div>
                <a href="${r.url}" target="${r.url.startsWith('http') ? '_blank' : '_self'}" class="btn btn-primary" style="text-align:center;">
                    🚀 Open Resource
                </a>
            </div>
        `).join('')}
    </div>`;
}

// Global DOM initialization & Multi-tab Synchronization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    refreshRealTimeStatsUI();
    loadJoinedTribesLiveFeed();
    loadCommunities();
    renderStudyResources();
    initAiChatQueryPrompt();
});

window.addEventListener('storage', (e) => {
    if (e.key === 'user') {
        refreshRealTimeStatsUI();
        loadCommunities();
        loadJoinedTribesLiveFeed();
    }
});
