if (typeof supabase === 'undefined' || !supabase.auth) {
    console.error('Supabase není inicializován');
} else {
    console.log('Supabase připraven s auth');
}

let currentUser = null;

async function getAccessToken() {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.access_token;
}

async function uploadImage(file) {
    if (!file) return null;
    
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen');
            return null;
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `filamenty/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('filament-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            console.error('Chyba nahrávání:', error);
            alert('Chyba nahrávání: ' + error.message);
            return null;
        }
        
        const { data: urlData } = supabase.storage
            .from('filament-images')
            .getPublicUrl(filePath);
        
        console.log('Obrázek nahrán:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error) {
        console.error('Chyba:', error);
        return null;
    }
}

async function checkUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.log('Nejsem přihlášen');
            return false;
        }
        
        if (user) {
            let role = 'user';
            if (user.user_metadata?.role) {
                role = user.user_metadata.role;
            } else if (user.raw_user_meta_data?.role) {
                role = user.raw_user_meta_data.role;
            }
            
            currentUser = {
                email: user.email,
                role: role,
                id: user.id
            };
            
            console.log('Role:', role);
            showUserInfo();
            updateNav();
            checkPageAccess();
            return true;
        }
    } catch (e) {
        console.log('Chyba:', e);
    }
    return false;
}

function updateNav() {
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        if (link.textContent === 'Přihlášení' && isAuthenticated()) {
            link.textContent = '👤 ' + currentUser.email;
            link.href = '#';
        }
    });
}

function showUserInfo() {
    const loginForm = document.getElementById('loginForm');
    const userInfo = document.getElementById('userInfo');
    if (loginForm && userInfo && currentUser) {
        loginForm.style.display = 'none';
        userInfo.style.display = 'block';
        document.getElementById('currentUserEmail').textContent = currentUser.email;
        const roleText = currentUser.role === 'admin' ? 'Administrátor' : 'Uživatel';
        document.getElementById('currentUserRole').textContent = roleText;
        document.getElementById('currentUserRole').style.color = currentUser.role === 'admin' ? '#ff6b00' : '#00cc66';
    }
}

document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('authMessage');
    
    if (!email || !password) {
        msg.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Vyplň email a heslo`;
        msg.style.color = '#ff4444';
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            msg.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${error.message}`;
            msg.style.color = '#ff4444';
            return;
        }
        
        let role = 'user';
        if (data.user.user_metadata?.role) {
            role = data.user.user_metadata.role;
        } else if (data.user.raw_user_meta_data?.role) {
            role = data.user.raw_user_meta_data.role;
        }
        
        currentUser = {
            email: data.user.email,
            role: role,
            id: data.user.id
        };
        
        msg.innerHTML = `<i class="fas fa-check-circle"></i> Přihlášení úspěšné!`;
        msg.style.color = '#00cc66';
        
        setTimeout(() => {
            window.location.href = 'filamenty.html';
        }, 800);
    } catch (e) {
        msg.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Chyba: ${e.message}`;
        msg.style.color = '#ff4444';
    }
});

async function logoutUser() {
    await supabase.auth.signOut();
    currentUser = null;
    location.reload();
}

function getCurrentUser() {
    return currentUser;
}

function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

function isAuthenticated() {
    return currentUser !== null;
}

function checkPageAccess() {
    const authGuard = document.getElementById('authGuard');
    const protectedContent = document.getElementById('protectedContent');
    const path = window.location.pathname;
    
    if (!authGuard || !protectedContent) return true;
    
    if (path.includes('index.html') || path.includes('login.html') || path === '/' || path === '') {
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    if (path.includes('cenik.html') || path.includes('stl.html')) {
        if (!isAdmin()) {
            authGuard.style.display = 'flex';
            protectedContent.style.display = 'none';
            return false;
        }
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    if (path.includes('filamenty.html') || path.includes('naklady.html')) {
        if (!isAuthenticated()) {
            authGuard.style.display = 'flex';
            protectedContent.style.display = 'none';
            return false;
        }
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    authGuard.style.display = 'none';
    protectedContent.style.display = 'block';
    return true;
}

async function loadFilaments() {
    try {
        const token = await getAccessToken();
        const headers = {
            'apikey': CONFIG.SUPABASE_KEY,
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty`, { headers });
        const data = await response.json();
        console.log('Načteno filamentů:', data.length);
        
        const grid = document.getElementById('filamentGrid');
        if (grid) {
            grid.innerHTML = '';
            
            if (data.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fas fa-box-open" style="font-size: 48px; color: var(--primary);"></i>
                        <p style="margin-top: 15px;">Zatím žádné filamenty. Přidej první!</p>
                    </div>
                `;
                return;
            }
            
            data.forEach(f => {
                const spotreba = f.zaklad > 0 ? Math.round((1 - f.aktualni / f.zaklad) * 100) : 0;
                const progressColor = spotreba > 80 ? '#ff4444' : spotreba > 50 ? '#ffaa00' : '#00cc66';
                const cena = f.cena_kg || 0;
                
                const editButton = isAdmin() ? 
                    `<button onclick="openEditModal(${f.id})" class="edit-btn" title="Upravit filament">
                        <i class="fas fa-pen"></i>
                    </button>` : 
                    '';
                
                grid.innerHTML += `
                    <div class="filament-card">
                        <div class="filament-image">
                            <img src="${f.obrazek || 'https://placehold.co/200x140/333333/FFFFFF?text=3D'}" 
                                 alt="${f.vyrobce} ${f.barva}" 
                                 onerror="this.src='https://placehold.co/200x140/333333/FFFFFF?text=3D'">
                            ${editButton}
                        </div>
                        <div class="filament-info">
                            <h3>${f.vyrobce}</h3>
                            <p class="color" style="color: ${f.barva}">${f.barva}</p>
                            <p class="material"><i class="fas fa-cog"></i> ${f.material}</p>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0;">
                                <span class="weight"><i class="fas fa-weight"></i> ${f.kg} kg</span>
                                <span class="price"><i class="fas fa-crown"></i> ${cena} Kč/kg</span>
                            </div>
                            <div class="meter-info">
                                <span>Základ: ${f.zaklad}m</span>
                                <span>Aktuální: <strong>${f.aktualni}m</strong></span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${spotreba}%; background: ${progressColor};"></div>
                            </div>
                            <span class="spotreba" style="color: ${progressColor}">${spotreba}% spotřebováno</span>
                        </div>
                    </div>
                `;
            });

            const select = document.getElementById('filamentSelect');
            if (select) {
                select.innerHTML = '<option value="">-- Vyber filament --</option>';
                data.forEach(f => {
                    select.innerHTML += `<option value="${f.id}">${f.vyrobce} - ${f.barva} (${f.aktualni}m) - ${f.cena_kg || 0} Kč/kg</option>`;
                });
            }

            const totalFilaments = document.getElementById('totalFilaments');
            const totalMeters = document.getElementById('totalMeters');
            const totalPrints = document.getElementById('totalPrints');
            
            if (totalFilaments) totalFilaments.textContent = data.length;
            if (totalMeters) {
                const sum = data.reduce((acc, f) => acc + f.aktualni, 0);
                totalMeters.textContent = Math.round(sum);
            }
            if (totalPrints) {
                const sum = data.reduce((acc, f) => acc + (f.zaklad - f.aktualni), 0);
                totalPrints.textContent = Math.round(sum);
            }
        }
    } catch (error) {
        console.error('Chyba načítání filamentů:', error);
    }
}

document.getElementById('addFilamentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = await getAccessToken();
    if (!token) {
        alert('Nejsi přihlášen!');
        return;
    }
    
    const imageFile = document.getElementById('imageFile').files[0];
    let imageUrl = document.getElementById('obrazek').value || null;
    
    if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
            imageUrl = uploadedUrl;
        }
    }
    
    const data = {
        vyrobce: document.getElementById('vyrobce').value,
        barva: document.getElementById('barva').value,
        material: document.getElementById('material').value,
        kg: parseFloat(document.getElementById('kg').value),
        cena_kg: parseFloat(document.getElementById('cena_kg').value) || 0,
        zaklad: parseFloat(document.getElementById('zaklad').value),
        aktualni: parseFloat(document.getElementById('aktualni').value),
        obrazek: imageUrl
    };

    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty`, {
            method: 'POST',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Chyba:', response.status, errorData);
            alert('Chyba: ' + response.status);
            return;
        }
        
        alert('Filament přidán!');
        loadFilaments();
        e.target.reset();
    } catch (error) {
        alert('Chyba: ' + error.message);
        console.error(error);
    }
});

async function openEditModal(id) {
    console.log('Otevírám editaci filamentu ID:', id);
    
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return;
        }
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty?id=eq.${id}`, {
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        const filament = data[0];
        
        if (!filament) {
            alert('Filament nenalezen!');
            return;
        }
        
        document.getElementById('editId').value = filament.id;
        document.getElementById('editVyrobce').value = filament.vyrobce;
        document.getElementById('editBarva').value = filament.barva;
        document.getElementById('editMaterial').value = filament.material;
        document.getElementById('editKg').value = filament.kg;
        document.getElementById('editCenaKg').value = filament.cena_kg || 0;
        document.getElementById('editZaklad').value = filament.zaklad;
        document.getElementById('editAktualni').value = filament.aktualni;
        document.getElementById('editObrazek').value = filament.obrazek || '';
        document.getElementById('editImageFile').value = '';
        
        document.getElementById('editModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Chyba při načítání filamentu:', error);
        alert('Chyba: ' + error.message);
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

document.getElementById('editFilamentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const token = await getAccessToken();
    if (!token) {
        alert('Nejsi přihlášen!');
        return;
    }
    
    const imageFile = document.getElementById('editImageFile').files[0];
    let imageUrl = document.getElementById('editObrazek').value || null;
    
    if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
            imageUrl = uploadedUrl;
        }
    }
    
    const data = {
        vyrobce: document.getElementById('editVyrobce').value,
        barva: document.getElementById('editBarva').value,
        material: document.getElementById('editMaterial').value,
        kg: parseFloat(document.getElementById('editKg').value),
        cena_kg: parseFloat(document.getElementById('editCenaKg').value) || 0,
        zaklad: parseFloat(document.getElementById('editZaklad').value),
        aktualni: parseFloat(document.getElementById('editAktualni').value),
        obrazek: imageUrl
    };

    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Chyba:', response.status, errorData);
            alert('Chyba: ' + response.status);
            return;
        }
        
        alert('Filament upraven!');
        closeEditModal();
        loadFilaments();
    } catch (error) {
        alert('Chyba: ' + error.message);
        console.error(error);
    }
});

async function deleteFromEdit() {
    const id = document.getElementById('editId').value;
    if (!id) {
        alert('Chyba: ID filamentu nebylo nalezeno!');
        return;
    }
    
    closeEditModal();
    
    if (!confirm('Opravdu smazat tento filament?')) {
        return;
    }
    
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return;
        }
        
        console.log('Mažu filament ID:', id);
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Chyba při mazání:', response.status, errorData);
            alert('Chyba: ' + response.status);
            return;
        }
        
        console.log('Filament smazán!');
        alert('Filament byl úspěšně smazán!');
        loadFilaments();
        
    } catch (error) {
        console.error('Chyba:', error);
        alert('Chyba: ' + error.message);
    }
}

async function odecistFilament() {
    const id = document.getElementById('filamentSelect').value;
    const metry = parseFloat(document.getElementById('spotreba').value);
    
    if (!id || !metry) {
        document.getElementById('vysledek').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Vyber filament a zadej metry';
        return;
    }

    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return;
        }
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty?id=eq.${id}`, {
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        const aktualni = Math.max(0, data[0].aktualni - metry);

        await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ aktualni: aktualni })
        });

        document.getElementById('vysledek').innerHTML = `<i class="fas fa-check-circle"></i> Odečteno ${metry}m. Zbývá ${aktualni}m`;
        loadFilaments();
    } catch (error) {
        alert('Chyba při odečítání');
        console.error(error);
    }
}

function filterFilaments() {
    const material = document.getElementById('filterMaterial').value;
    const color = document.getElementById('filterColor').value;
    
    const cards = document.querySelectorAll('.filament-card');
    cards.forEach(card => {
        const materialText = card.querySelector('.material')?.textContent || '';
        const colorText = card.querySelector('.color')?.textContent || '';
        let show = true;
        if (material && !materialText.includes(material)) show = false;
        if (color && !colorText.includes(color)) show = false;
        card.style.display = show ? '' : 'none';
    });
}

function resetFilters() {
    document.getElementById('filterMaterial').value = '';
    document.getElementById('filterColor').value = '';
    document.querySelectorAll('.filament-card').forEach(card => {
        card.style.display = '';
    });
}

function searchFilaments() {
    const input = document.getElementById('searchFilament');
    if (!input) return;
    
    const filter = input.value.toLowerCase();
    const cards = document.querySelectorAll('.filament-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(filter)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function searchGlobal() {
    const input = document.getElementById('searchGlobal');
    if (!input) return;
    
    const filter = input.value.toLowerCase();
    const cards = document.querySelectorAll('.filament-card');
    const models = document.querySelectorAll('.model-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(filter)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
    
    models.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(filter)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function calculateCost() {
    const weight = parseFloat(document.getElementById('costWeight').value) || 0;
    const time = parseFloat(document.getElementById('costTime').value) || 0;
    const filamentPrice = parseFloat(document.getElementById('costFilamentPrice').value) || 0;
    
    const filamentCost = (weight / 1000) * filamentPrice;
    const electricCost = time * 5;
    const totalCost = filamentCost + electricCost;
    const costPerGram = weight > 0 ? totalCost / weight : 0;
    
    document.getElementById('filamentCost').textContent = filamentCost.toFixed(2) + ' Kč';
    document.getElementById('electricCost').textContent = electricCost.toFixed(2) + ' Kč';
    document.getElementById('totalCost').textContent = totalCost.toFixed(2) + ' Kč';
    document.getElementById('costPerGram').textContent = costPerGram.toFixed(2) + ' Kč';
}

async function loadModels() {
    try {
        const token = await getAccessToken();
        const headers = {
            'apikey': CONFIG.SUPABASE_KEY,
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/modely`, { headers });
        const data = await response.json();
        console.log('Modely načteno:', data.length);
        
        const grid = document.getElementById('modelsGrid');
        if (grid) {
            grid.innerHTML = '';
            
            if (data.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fas fa-box-open" style="font-size: 48px; color: var(--primary);"></i>
                        <p style="margin-top: 15px;">Zatím žádné modely. Přidej první!</p>
                    </div>
                `;
                return;
            }
            
            data.forEach(m => {
                const editButton = isAdmin() ? 
                    `<button onclick="openEditModelModal(${m.id})" class="edit-btn" title="Upravit model">
                        <i class="fas fa-pen"></i>
                    </button>` : 
                    '';
                
                grid.innerHTML += `
                    <div class="model-card">
                        <div class="model-image">
                            <img src="${m.obrazek || 'https://placehold.co/200x160/333333/FFFFFF?text=Model'}" 
                                 alt="${m.nazev}" 
                                 onerror="this.src='https://placehold.co/200x160/333333/FFFFFF?text=Model'">
                            ${editButton}
                        </div>
                        <div class="model-info">
                            <h3>${m.nazev}</h3>
                            <p class="model-price"><i class="fas fa-crown" style="color: #ffd700;"></i> ${m.cena} Kč</p>
                        </div>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error('Chyba načítání modelů:', error);
    }
}

document.getElementById('addModelForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = await getAccessToken();
    if (!token) {
        alert('Nejsi přihlášen!');
        return;
    }
    
    const imageFile = document.getElementById('modelImageFile').files[0];
    let imageUrl = document.getElementById('modelObrazek').value || null;
    
    if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
            imageUrl = uploadedUrl;
        }
    }
    
    const data = {
        nazev: document.getElementById('modelNazev').value,
        cena: parseFloat(document.getElementById('modelCena').value),
        obrazek: imageUrl
    };

    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/modely`, {
            method: 'POST',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Chyba:', response.status, errorData);
            alert('Chyba: ' + response.status);
            return;
        }
        
        alert('Model přidán!');
        loadModels();
        e.target.reset();
    } catch (error) {
        alert('Chyba: ' + error.message);
        console.error(error);
    }
});

async function openEditModelModal(id) {
    console.log('Otevírám editaci modelu ID:', id);
    
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return;
        }
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/modely?id=eq.${id}`, {
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        const model = data[0];
        
        if (!model) {
            alert('Model nenalezen!');
            return;
        }
        
        document.getElementById('editModelId').value = model.id;
        document.getElementById('editModelNazev').value = model.nazev;
        document.getElementById('editModelCena').value = model.cena;
        document.getElementById('editModelObrazek').value = model.obrazek || '';
        document.getElementById('editModelImageFile').value = '';
        
        document.getElementById('editModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Chyba při načítání modelu:', error);
        alert('Chyba: ' + error.message);
    }
}

document.getElementById('editModelForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('editModelId').value;
    const token = await getAccessToken();
    if (!token) {
        alert('Nejsi přihlášen!');
        return;
    }
    
    const imageFile = document.getElementById('editModelImageFile').files[0];
    let imageUrl = document.getElementById('editModelObrazek').value || null;
    
    if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
            imageUrl = uploadedUrl;
        }
    }
    
    const data = {
        nazev: document.getElementById('editModelNazev').value,
        cena: parseFloat(document.getElementById('editModelCena').value),
        obrazek: imageUrl
    };

    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/modely?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Chyba:', response.status, errorData);
            alert('Chyba: ' + response.status);
            return;
        }
        
        alert('Model upraven!');
        closeEditModal();
        loadModels();
    } catch (error) {
        alert('Chyba: ' + error.message);
        console.error(error);
    }
});

async function deleteModelFromEdit() {
    const id = document.getElementById('editModelId').value;
    if (!id) {
        alert('Chyba: ID modelu nebylo nalezeno!');
        return;
    }
    
    closeEditModal();
    
    if (!confirm('Opravdu smazat tento model?')) {
        return;
    }
    
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return;
        }
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/modely?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Chyba při mazání:', response.status, errorData);
            alert('Chyba: ' + response.status);
            return;
        }
        
        alert('Model smazán!');
        loadModels();
        
    } catch (error) {
        console.error('Chyba:', error);
        alert('Chyba: ' + error.message);
    }
}

document.querySelector('.hamburger')?.addEventListener('click', function() {
    document.querySelector('nav ul').classList.toggle('open');
});

document.getElementById('editModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeEditModal();
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Stránka načtena');
    
    if (typeof supabase !== 'undefined' && supabase && supabase.auth) {
        await checkUser();
        if (document.getElementById('filamentGrid')) {
            loadFilaments();
        }
        if (document.getElementById('modelsGrid')) {
            loadModels();
        }
    } else {
        console.error('Supabase není inicializován!');
    }
});