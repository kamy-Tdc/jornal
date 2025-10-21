import { auth, database, storage } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    ref as dbRef, 
    set, 
    get, 
    push, 
    remove,
    onValue 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Global Variables
let currentUser = null;
let selectedRating = 0;
const ADMIN_EMAIL = 'kartywillytdc@gmail.com';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    loadReviews();
    loadVideo();
    loadGallery();
    initializeStarRating();
    loadSettings();
});

// Auth State Observer
function initializeAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            updateUIForLoggedInUser(user);
            loadUserProfile(user.uid);
        } else {
            currentUser = null;
            updateUIForLoggedOutUser();
        }
    });
}

// Update UI for Logged In User
async function updateUIForLoggedInUser(user) {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const loginBtn = document.getElementById('loginBtn');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileAvatar = document.getElementById('profileAvatar');

    // Get user data from database
    const userRef = dbRef(database, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
        const userData = snapshot.val();
        profileName.textContent = userData.nickname || userData.fullName || 'Usuário';
        profileEmail.textContent = user.email;
        
        if (userData.photoURL) {
            profileAvatar.innerHTML = `<img src="${userData.photoURL}" alt="Profile">`;
        }
    } else {
        profileName.textContent = user.email.split('@')[0];
        profileEmail.textContent = user.email;
    }

    loginBtn.style.display = 'none';
    profileBtn.style.display = 'block';
    logoutBtn.style.display = 'block;

    // Show admin controls if user is admin
    if (user.email === ADMIN_EMAIL) {
        document.getElementById('adminControls').style.display = 'block';
        document.getElementById('galleryAdminControls').style.display = 'block';
    }
}

// Update UI for Logged Out User
function updateUIForLoggedOutUser() {
    document.getElementById('profileName').textContent = 'Visitante';
    document.getElementById('profileEmail').textContent = 'Faça login';
    document.getElementById('profileAvatar').innerHTML = '<i class="fas fa-user"></i>';
    document.getElementById('loginBtn').style.display = 'block';
    document.getElementById('profileBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('adminControls').style.display = 'none';
    document.getElementById('galleryAdminControls').style.display = 'none';
}

// Toggle Profile Menu
window.toggleProfileMenu = function() {
    const menu = document.getElementById('profileMenu');
    menu.classList.toggle('active');
    
    // Close menu when clicking outside
    document.addEventListener('click', function closeMenu(e) {
        if (!e.target.closest('.profile-btn') && !e.target.closest('.profile-menu')) {
            menu.classList.remove('active');
            document.removeEventListener('click', closeMenu);
        }
    });
}

// Show Login Modal
window.showLogin = function() {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginFormContainer');
    const registerForm = document.getElementById('registerFormContainer');
    const profileView = document.getElementById('profileViewContainer');
    
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    profileView.style.display = 'none';
    modal.classList.add('active');
    document.getElementById('profileMenu').classList.remove('active');
}

// Show Register
window.showRegister = function() {
    document.getElementById('loginFormContainer').style.display = 'none';
    document.getElementById('registerFormContainer').style.display = 'block';
}

// Show Profile
window.showProfile = async function() {
    if (!currentUser) return;
    
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginFormContainer');
    const registerForm = document.getElementById('registerFormContainer');
    const profileView = document.getElementById('profileViewContainer');
    
    // Load user data
    const userRef = dbRef(database, `users/${currentUser.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
        const userData = snapshot.val();
        document.getElementById('displayFullName').textContent = userData.fullName || 'Sem nome';
        document.getElementById('displayNickname').textContent = '@' + (userData.nickname || 'sem apelido');
        document.getElementById('displayEmail').textContent = currentUser.email;
        
        const photoDisplay = document.getElementById('profilePhotoDisplay');
        if (userData.photoURL) {
            photoDisplay.innerHTML = `<img src="${userData.photoURL}" alt="Profile">`;
        } else {
            photoDisplay.innerHTML = '<i class="fas fa-user"></i>';
        }
    }
    
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    profileView.style.display = 'block';
    modal.classList.add('active');
    document.getElementById('profileMenu').classList.remove('active');
}

// Close Auth Modal
window.closeAuthModal = function() {
    document.getElementById('authModal').classList.remove('active');
}

// Handle Login
window.handleLogin = async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        closeAuthModal();
        showNotification('Login realizado com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro no login: ' + error.message, 'error');
    }
    
    return false;
}

// Handle Register
window.handleRegister = async function(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('registerFullName').value;
    const nickname = document.getElementById('registerNickname').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const photoFile = document.getElementById('registerPhoto').files[0];
    
    try {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        let photoURL = null;
        
        // Upload photo if provided
        if (photoFile) {
            const photoStorageRef = storageRef(storage, `profilePhotos/${user.uid}`);
            await uploadBytes(photoStorageRef, photoFile);
            photoURL = await getDownloadURL(photoStorageRef);
        }
        
        // Save user data to database
        await set(dbRef(database, `users/${user.uid}`), {
            fullName: fullName,
            nickname: nickname,
            email: email,
            photoURL: photoURL,
            createdAt: new Date().toISOString()
        });
        
        closeAuthModal();
        showNotification('Registro realizado com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro no registro: ' + error.message, 'error');
    }
    
    return false;
}

// Load User Profile
async function loadUserProfile(uid) {
    const userRef = dbRef(database, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
        const userData = snapshot.val();
        // Update profile display if needed
        console.log('User data loaded:', userData);
    }
}

// Logout
window.logout = async function() {
    try {
        await signOut(auth);
        showNotification('Logout realizado com sucesso!', 'success');
        document.getElementById('profileMenu').classList.remove('active');
    } catch (error) {
        showNotification('Erro ao fazer logout: ' + error.message, 'error');
    }
}

// Star Rating System
function initializeStarRating() {
    const stars = document.querySelectorAll('#starRating i');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            updateStarDisplay();
        });
        
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
    });
    
    document.getElementById('starRating').addEventListener('mouseleave', function() {
        updateStarDisplay();
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('#starRating i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

function updateStarDisplay() {
    highlightStars(selectedRating);
}

// Submit Review
window.submitReview = async function() {
    if (!currentUser) {
        showNotification('Você precisa estar logado para avaliar!', 'error');
        showLogin();
        return;
    }
    
    if (selectedRating === 0) {
        showNotification('Por favor, selecione uma nota!', 'error');
        return;
    }
    
    const reviewText = document.getElementById('reviewText').value.trim();
    
    if (!reviewText) {
        showNotification('Por favor, escreva sua opinião!', 'error');
        return;
    }
    
    try {
        // Get user data
        const userRef = dbRef(database, `users/${currentUser.uid}`);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val();
        
        // Create review
        const reviewsRef = dbRef(database, 'reviews');
        const newReviewRef = push(reviewsRef);
        
        await set(newReviewRef, {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userName: userData?.fullName || currentUser.email.split('@')[0],
            userNickname: userData?.nickname || '',
            userPhoto: userData?.photoURL || null,
            rating: selectedRating,
            text: reviewText,
            timestamp: new Date().toISOString()
        });
        
        // Reset form
        document.getElementById('reviewText').value = '';
        selectedRating = 0;
        updateStarDisplay();
        
        showNotification('Avaliação enviada com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao enviar avaliação: ' + error.message, 'error');
    }
}

// Load Reviews
function loadReviews() {
    const reviewsRef = dbRef(database, 'reviews');
    
    onValue(reviewsRef, (snapshot) => {
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '';
        
        if (!snapshot.exists()) {
            reviewsList.innerHTML = '<p class="no-reviews">Nenhuma avaliação ainda. Seja o primeiro!</p>';
            return;
        }
        
        const reviews = [];
        snapshot.forEach((childSnapshot) => {
            reviews.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Sort by timestamp (newest first)
        reviews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        reviews.forEach(review => {
            const reviewCard = createReviewCard(review);
            reviewsList.appendChild(reviewCard);
        });
    });
}

// Create Review Card
function createReviewCard(review) {
    const card = document.createElement('div');
    card.className = 'review-card';
    
    const stars = '<i class="fas fa-star"></i>'.repeat(review.rating) + 
                  '<i class="far fa-star"></i>'.repeat(5 - review.rating);
    
    const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
    const deleteButton = isAdmin ? 
        `<button class="delete-review-btn" onclick="deleteReview('${review.id}')">
            <i class="fas fa-trash"></i> Excluir
        </button>` : '';
    
    const photoHTML = review.userPhoto ? 
        `<img src="${review.userPhoto}" alt="${review.userName}">` : 
        '<i class="fas fa-user"></i>';
    
    const date = new Date(review.timestamp).toLocaleDateString('pt-BR');
    
    card.innerHTML = `
        <div class="review-header">
            <div class="review-user">
                <div class="review-avatar">${photoHTML}</div>
                <div class="review-info">
                    <h4>${review.userName}</h4>
                    <p>${review.userNickname ? '@' + review.userNickname : review.userEmail} • ${date}</p>
                </div>
            </div>
            <div class="review-rating">${stars}</div>
        </div>
        <p class="review-text">${review.text}</p>
        ${deleteButton ? `<div class="review-actions">${deleteButton}</div>` : ''}
    `;
    
    return card;
}

// Delete Review (Admin only)
window.deleteReview = async function(reviewId) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        showNotification('Apenas administradores podem excluir avaliações!', 'error');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) {
        return;
    }
    
    try {
        await remove(dbRef(database, `reviews/${reviewId}`));
        showNotification('Avaliação excluída com sucesso!', 'success');
    } catch (error) {
        showNotification('Erro ao excluir avaliação: ' + error.message, 'error');
    }
}

// Upload Video (Admin only)
window.uploadVideo = async function() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        showNotification('Apenas administradores podem fazer upload de vídeos!', 'error');
        return;
    }
    
    const videoFile = document.getElementById('videoUpload').files[0];
    
    if (!videoFile) {
        showNotification('Por favor, selecione um vídeo!', 'error');
        return;
    }
    
    try {
        showNotification('Uploading vídeo... Aguarde.', 'info');
        
        const videoStorageRef = storageRef(storage, `videos/journal-video`);
        await uploadBytes(videoStorageRef, videoFile);
        const videoURL = await getDownloadURL(videoStorageRef);
        
        // Save video URL to database
        await set(dbRef(database, 'content/video'), {
            url: videoURL,
            uploadedBy: currentUser.email,
            uploadedAt: new Date().toISOString()
        });
        
        showNotification('Vídeo atualizado com sucesso!', 'success');
        loadVideo();
    } catch (error) {
        showNotification('Erro ao fazer upload do vídeo: ' + error.message, 'error');
    }
}

// Load Video
function loadVideo() {
    const videoRef = dbRef(database, 'content/video');
    
    onValue(videoRef, (snapshot) => {
        const videoContainer = document.getElementById('videoContainer');
        
        if (snapshot.exists()) {
            const videoData = snapshot.val();
            videoContainer.innerHTML = `
                <video controls style="width: 100%; border-radius: 20px;">
                    <source src="${videoData.url}" type="video/mp4">
                    Seu navegador não suporta o elemento de vídeo.
                </video>
            `;
        }
    });
}

// Upload Images (Admin only)
window.uploadImages = async function() {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        showNotification('Apenas administradores podem fazer upload de imagens!', 'error');
        return;
    }
    
    const imageFiles = document.getElementById('imageUpload').files;
    
    if (imageFiles.length === 0) {
        showNotification('Por favor, selecione pelo menos uma imagem!', 'error');
        return;
    }
    
    try {
        showNotification('Uploading imagens... Aguarde.', 'info');
        
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const imageStorageRef = storageRef(storage, `gallery/${Date.now()}_${file.name}`);
            await uploadBytes(imageStorageRef, file);
            const imageURL = await getDownloadURL(imageStorageRef);
            
            // Save image URL to database
            const galleryRef = dbRef(database, 'content/gallery');
            const newImageRef = push(galleryRef);
            await set(newImageRef, {
                url: imageURL,
                uploadedBy: currentUser.email,
                uploadedAt: new Date().toISOString()
            });
        }
        
        showNotification('Imagens adicionadas com sucesso!', 'success');
        document.getElementById('imageUpload').value = '';
    } catch (error) {
        showNotification('Erro ao fazer upload das imagens: ' + error.message, 'error');
    }
}

// Load Gallery
function loadGallery() {
    const galleryRef = dbRef(database, 'content/gallery');
    
    onValue(galleryRef, (snapshot) => {
        const galleryGrid = document.getElementById('galleryGrid');
        galleryGrid.innerHTML = '';
        
        if (!snapshot.exists()) {
            galleryGrid.innerHTML = `
                <div class="gallery-placeholder">
                    <i class="fas fa-image"></i>
                    <p>Nenhuma imagem na galeria ainda</p>
                </div>
            `;
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const imageData = childSnapshot.val();
            const imageItem = document.createElement('div');
            imageItem.className = 'gallery-item';
            imageItem.innerHTML = `<img src="${imageData.url}" alt="Galeria">`;
            imageItem.onclick = () => openImageModal(imageData.url);
            galleryGrid.appendChild(imageItem);
        });
    });
}

// Open Image Modal
function openImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90vh; padding: 0; background: transparent;">
            <span class="close" onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 20px; right: 20px; background: var(--surface); z-index: 10;">&times;</span>
            <img src="${imageUrl}" style="width: 100%; height: auto; border-radius: 20px;">
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Settings Modal
window.openSettings = function() {
    document.getElementById('settingsModal').classList.add('active');
}

window.closeSettings = function() {
    document.getElementById('settingsModal').classList.remove('active');
}

// Apply Theme Color
window.applyThemeColor = function() {
    const color = document.getElementById('themeColor').value;
    document.documentElement.style.setProperty('--primary-color', color);
    localStorage.setItem('themeColor', color);
    showNotification('Cor do tema aplicada!', 'success');
}

window.setPresetColor = function(color) {
    document.getElementById('themeColor').value = color;
    applyThemeColor();
}

window.setRainbowMode = function() {
    document.body.classList.toggle('rainbow-mode');
    const isRainbow = document.body.classList.contains('rainbow-mode');
    localStorage.setItem('rainbowMode', isRainbow);
    showNotification(isRainbow ? 'Modo arco-íris ativado! 🌈' : 'Modo arco-íris desativado', 'success');
}

// Apply Font
window.applyFont = function() {
    const font = document.getElementById('fontSelector').value;
    document.documentElement.style.setProperty('--font-family', font);
    localStorage.setItem('fontFamily', font);
    showNotification('Fonte aplicada!', 'success');
}

// Reset Settings
window.resetSettings = function() {
    if (!confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
        return;
    }
    
    localStorage.removeItem('themeColor');
    localStorage.removeItem('fontFamily');
    localStorage.removeItem('rainbowMode');
    
    document.documentElement.style.setProperty('--primary-color', '#007aff');
    document.documentElement.style.setProperty('--font-family', "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
    document.body.classList.remove('rainbow-mode');
    document.getElementById('themeColor').value = '#007aff';
    document.getElementById('fontSelector').value = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    
    showNotification('Configurações restauradas!', 'success');
}

// Load Settings
function loadSettings() {
    const savedColor = localStorage.getItem('themeColor');
    const savedFont = localStorage.getItem('fontFamily');
    const savedRainbow = localStorage.getItem('rainbowMode');
    
    if (savedColor) {
        document.documentElement.style.setProperty('--primary-color', savedColor);
        document.getElementById('themeColor').value = savedColor;
    }
    
    if (savedFont) {
        document.documentElement.style.setProperty('--font-family', savedFont);
        document.getElementById('fontSelector').value = savedFont;
    }
    
    if (savedRainbow === 'true') {
        document.body.classList.add('rainbow-mode');
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary-color)'};
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
