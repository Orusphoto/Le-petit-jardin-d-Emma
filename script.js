// On importe les outils Firebase via le Web (plus simple pour débuter)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. TA CONFIGURATION (À REMPLACER !)
const firebaseConfig = {
    apiKey: "AIzaSyDWGZqdrtrtcqlbha0yMIEoQSTRdl1z8LA",
    authDomain: "mon-herbier-4af87.firebaseapp.com",
    projectId: "mon-herbier-4af87",
    storageBucket: "mon-herbier-4af87.firebasestorage.app",
    messagingSenderId: "977514883933",
    appId: "1:977514883933:web:2864c4e9a0343b0ba356b4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const plantCol = collection(db, "plantes");

// --- 2. VARIABLES GLOBALES ---
let allPlants = []; 
let currentSearch = "";
let currentTag = "all";
let currentPlantId = null;
let idToDelete = null;

const plantGrid = document.getElementById('plantGrid');
const plantForm = document.getElementById('plantForm');
const modal = document.getElementById('plantModal');
const modalBody = document.getElementById('modalBody');
const deleteModal = document.getElementById('deleteModal');
const searchInput = document.getElementById('searchInput');

const icons = {
    "Fleur": "🌸",
    "Arbre": "🌳",
    "Plante Verte": "🌿",
    "Succulente": "🌵"
};

// --- 3. SYNC FIREBASE & FILTRAGE ---

onSnapshot(plantCol, (snapshot) => {
    allPlants = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGrid();
});

function renderGrid() {
    plantGrid.innerHTML = '';
    const filtered = allPlants.filter(p => {
        const matchSearch = p.nom.toLowerCase().includes(currentSearch.toLowerCase());
        const matchTag = (currentTag === "all" || p.cat === currentTag);
        return matchSearch && matchTag;
    });

    filtered.forEach((plant, index) => {
        const card = document.createElement('div');
        card.className = 'plant-card';
        // Animation de cascade (Stagger)
        card.style.animationDelay = `${(index * 0.05) + 0.5}s`;
        
        const icon = icons[plant.cat] || "🌱";

        card.innerHTML = `
            <button class="delete-btn" onclick="event.stopPropagation(); window.openDeleteConfirm('${plant.id}')"></button>
            <div class="image-container">
                <img src="${plant.image}" alt="${plant.nom}" loading="lazy">
            </div>
            <div class="plant-info">
                <h3>${plant.nom}</h3>
                <p class="latin-name">${plant.latin || ''}</p>
                <p style="color:#2d5a27; font-size:0.8rem; font-weight:600; margin-top:5px;">${icon} ${plant.cat}</p>
            </div>
        `;
        card.onclick = () => openModal(plant);
        plantGrid.appendChild(card);
    });
}

// Recherche & Tags
searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderGrid();
});

document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTag = btn.getAttribute('data-cat');
        renderGrid();
    };
});

// --- 4. HELPER DROPDOWNS PERSONNALISÉS ---

function setupDropdown(containerId, labelId, hiddenInputId) {
    const dropdown = document.getElementById(containerId);
    const label = document.getElementById(labelId);
    const hiddenInput = document.getElementById(hiddenInputId);

    if (!dropdown) return;

    dropdown.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-dropdown').forEach(d => {
            if(d !== dropdown) d.classList.remove('active');
        });
        dropdown.classList.toggle('active');
    };

    dropdown.querySelectorAll('.dropdown-option').forEach(opt => {
        opt.onclick = (e) => {
            label.innerText = opt.innerText; 
            hiddenInput.value = opt.getAttribute('data-val'); 
            dropdown.classList.remove('active');
            e.stopPropagation();
        };
    });
}

// Fermer les menus au clic extérieur
window.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('active'));
});

// --- 5. LOGIQUE DES MODALES ---

function closeModal() {
    modal.classList.remove('active');
    deleteModal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = "none";
        deleteModal.style.display = "none";
    }, 400);
}

document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = closeModal);
window.onclick = (e) => { if(e.target == modal || e.target == deleteModal) closeModal(); };

function openModal(plant) {
    currentPlantId = plant.id;
    const dangerValue = plant.danger || "Aucune";

    modalBody.innerHTML = `
        <div class="modal-image-container"><img src="${plant.image}"></div>
        <h2 style="margin-top:0; color:#2d5a27;">🌿 ${plant.nom}</h2>
        
        <div class="edit-group">
            <label>📖 Nom scientifique (Latin)</label>
            <input type="text" id="editLatin" value="${plant.latin || ''}" placeholder="Ex: Monstera deliciosa" class="latin-input-style">
        </div>

        <div class="edit-group">
            <label>⚠️ Dangerosité</label>
            <div class="custom-dropdown" id="dangerDropdown">
                <div class="dropdown-trigger">
                    <span id="dangerLabel">${dangerValue}</span>
                    <div class="arrow"></div>
                </div>
                <div class="dropdown-menu">
                    <div class="dropdown-option" data-val="Aucune">Aucune</div>
                    <div class="dropdown-option" data-val="Risque en cas d'ingestion">🍽️ Risque ingestion</div>
                    <div class="dropdown-option" data-val="Risque d'allergie respiratoire">💨 Risque respiratoire</div>
                    <div class="dropdown-option" data-val="Risque en cas de contact">🖐️ Risque contact</div>
                </div>
            </div>
            <input type="hidden" id="editDanger" value="${dangerValue}">
        </div>

        <div class="edit-group">
            <label>💧 Besoin en eau</label>
            <input type="text" id="editWater" value="${plant.arrosage || ''}" placeholder="Ex: 1x par semaine">
        </div>

        <div class="edit-group">
            <label>📝 Notes de l'herbier</label>
            <textarea id="editDesc" rows="4" placeholder="Description libre...">${plant.desc || ''}</textarea>
        </div>
    `;

    modal.style.display = "block";
    setTimeout(() => modal.classList.add('active'), 10);
    setupDropdown('dangerDropdown', 'dangerLabel', 'editDanger');
}

// --- 6. ACTIONS (SAVE, DELETE, ADD) ---

document.getElementById('saveDetailsBtn').onclick = async () => {
    if(!currentPlantId) return;
    try {
        await updateDoc(doc(db, "plantes", currentPlantId), {
            latin: document.getElementById('editLatin').value,
            danger: document.getElementById('editDanger').value,
            arrosage: document.getElementById('editWater').value,
            desc: document.getElementById('editDesc').value
        });
        console.log("✨ Modifications enregistrées !");
        closeModal();
    } catch(e) { console.error(e); }
};

window.openDeleteConfirm = (id) => {
    idToDelete = id;
    deleteModal.style.display = "block";
    setTimeout(() => deleteModal.classList.add('active'), 10);
};

document.getElementById('confirmDeleteBtn').onclick = async () => {
    if(idToDelete) {
        await deleteDoc(doc(db, "plantes", idToDelete));
        console.log("🗑️ Plante supprimée");
        closeModal();
    }
};

document.getElementById('cancelDeleteBtn').onclick = closeModal;

// Initialisation menu principal
setupDropdown('categoryDropdown', 'categoryLabel', 'category');

const imageFileInput = document.getElementById('imageFile');
const fileNameDisplay = document.getElementById('fileNameDisplay');

imageFileInput.onchange = () => {
    if(imageFileInput.files.length > 0) fileNameDisplay.innerText = "📸 " + imageFileInput.files[0].name;
};

const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 800;
                let w = img.width, h = img.height;
                if(w > h) { if(w > MAX){ h *= MAX/w; w = MAX; } }
                else { if(h > MAX){ w *= MAX/h; h = MAX; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
};

plantForm.onsubmit = async (e) => {
    e.preventDefault();
    const file = imageFileInput.files[0];
    let img = document.getElementById('imageLink').value;
    
    if(file) img = await compressImage(file);
    if(!img) img = "https://images.unsplash.com/photo-1545239351-ef056c0b01d8?w=400";

    await addDoc(plantCol, {
        nom: document.getElementById('commonName').value,
        latin: document.getElementById('latinName').value,
        cat: document.getElementById('category').value || "Plante Verte",
        image: img,
        danger: "Aucune", arrosage: "À définir", desc: ""
    });
    
    plantForm.reset();
    document.getElementById('categoryLabel').innerText = "Choisir un type";
    fileNameDisplay.innerText = "Aucun fichier choisi";
    console.log("✅ Plante ajoutée !");
};

// --- 7. EFFETS UI ---
window.onscroll = () => {
    const formCont = document.querySelector('.form-container');
    const floatBtn = document.getElementById('floatingAddBtn');
    if (window.scrollY > 150) {
        formCont.classList.add('form-hidden');
        floatBtn.classList.add('show');
    } else {
        formCont.classList.remove('form-hidden');
        floatBtn.classList.remove('show');
    }
};

document.getElementById('floatingAddBtn').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });