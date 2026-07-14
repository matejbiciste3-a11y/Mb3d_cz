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

async function uploadStlFile(file) {
    if (!file) return null;
    
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return null;
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `stl/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('stl-soubory')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            console.error('Chyba nahrávání STL:', error);
            alert('Chyba nahrávání STL: ' + error.message);
            return null;
        }
        
        const { data: urlData } = supabase.storage
            .from('stl-soubory')
            .getPublicUrl(filePath);
        
        console.log('STL nahrán:', urlData.publicUrl);
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
            const parentLi = link.parentElement;
            link.style.display = 'none';
            
            const userSpan = document.createElement('span');
            userSpan.textContent = '👤 ' + currentUser.email;
            userSpan.className = 'user-email';
            userSpan.style.cssText = 'cursor: pointer; padding: 8px 16px; border-radius: var(--radius-sm); color: var(--text-secondary); transition: var(--transition); display: inline-block;';
            userSpan.onclick = function(e) {
                e.stopPropagation();
                const dropdown = this.nextElementSibling;
                if (dropdown) {
                    dropdown.classList.toggle('show');
                }
            };
            
            const dropdown = document.createElement('div');
            dropdown.className = 'dropdown-menu';
            dropdown.style.cssText = 'display: none; position: absolute; right: 0; top: 100%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 0; min-width: 180px; box-shadow: var(--shadow); z-index: 1000;';
            
            const profileItem = document.createElement('a');
            profileItem.href = 'profile.html';
            profileItem.innerHTML = '<i class="fas fa-user"></i> Můj profil';
            profileItem.style.cssText = 'display: block; padding: 10px 20px; color: var(--text-primary); text-decoration: none; transition: var(--transition);';
            profileItem.onmouseover = function() {
                this.style.background = 'var(--bg-card-hover)';
            };
            profileItem.onmouseout = function() {
                this.style.background = 'transparent';
            };
            
            const logoutItem = document.createElement('a');
            logoutItem.href = '#';
            logoutItem.innerHTML = '<i class="fas fa-sign-out-alt"></i> Odhlásit se';
            logoutItem.style.cssText = 'display: block; padding: 10px 20px; color: var(--text-primary); text-decoration: none; transition: var(--transition);';
            logoutItem.onmouseover = function() {
                this.style.background = 'var(--bg-card-hover)';
            };
            logoutItem.onmouseout = function() {
                this.style.background = 'transparent';
            };
            logoutItem.onclick = function(e) {
                e.preventDefault();
                logoutUser();
            };
            
            dropdown.appendChild(profileItem);
            dropdown.appendChild(logoutItem);
            parentLi.appendChild(userSpan);
            parentLi.appendChild(dropdown);
            parentLi.style.position = 'relative';
            
            document.addEventListener('click', function() {
                dropdown.classList.remove('show');
            });
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
    
    if (path.includes('index.html') || path === '/' || path === '') {
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    if (path.includes('login.html')) {
        if (isAuthenticated()) {
            window.location.href = 'filamenty.html';
            return false;
        }
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    if (path.includes('filamenty.html')) {
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    if (path.includes('cenik.html')) {
        if (!isAuthenticated()) {
            authGuard.style.display = 'flex';
            protectedContent.style.display = 'none';
            return false;
        }
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    if (path.includes('stl.html')) {
        if (!isAdmin()) {
            authGuard.style.display = 'flex';
            protectedContent.style.display = 'none';
            return false;
        }
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    if (path.includes('naklady.html')) {
        if (!isAuthenticated()) {
            authGuard.style.display = 'flex';
            protectedContent.style.display = 'none';
            return false;
        }
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    if (path.includes('profile.html')) {
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
                            <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 5px;">
                                ${editButton}
                            </div>
                        </div>
                        <div class="filament-info">
                            <h3>${f.vyrobce}</h3>
                            <p class="color" style="color: ${f.barva}">${f.barva}</p>
                            <p class="material"><i class="fas fa-cog"></i> ${f.material}</p>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0;">
                                <span class="weight"><i class="fas fa-weight"></i> ${f.kg} kg</span>
                                <span class="price"><i class="fas fa-crown" style="color: #ffd700;"></i> ${cena} Kč/kg</span>
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
        }
        
        const totalFilaments = document.getElementById('totalFilaments');
        const totalMeters = document.getElementById('totalMeters');
        
        if (totalFilaments) {
            totalFilaments.textContent = data.length;
        }
        if (totalMeters) {
            const sum = data.reduce((acc, f) => acc + f.aktualni, 0);
            totalMeters.textContent = Math.round(sum);
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
            alert('Chyba: ' + response.status + ' - ' + errorData);
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
    const stl = document.querySelectorAll('.stl-card');
    
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
    
    stl.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(filter)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function calculateCost() {
    const meters = parseFloat(document.getElementById('costMeters').value) || 0;
    const time = parseFloat(document.getElementById('costTime').value) || 0;
    const filamentPrice = parseFloat(document.getElementById('costFilamentPrice').value) || 0;
    const gramPerMeter = parseFloat(document.getElementById('costGramPerMeter').value) || 3;
    
    const filamentUsage = meters * gramPerMeter;
    const filamentCost = (filamentUsage / 1000) * filamentPrice;
    const electricCost = time * 5;
    const totalCost = filamentCost + electricCost;
    
    document.getElementById('filamentUsage').textContent = filamentUsage.toFixed(1) + ' g';
    document.getElementById('filamentCost').textContent = filamentCost.toFixed(2) + ' Kč';
    document.getElementById('electricCost').textContent = electricCost.toFixed(2) + ' Kč';
    document.getElementById('totalCost').textContent = totalCost.toFixed(2) + ' Kč';
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
                            <img src="${m.obrazek || 'https://placehold.co/300x200/333333/FFFFFF?text=Model'}" 
                                 alt="${m.nazev}" 
                                 onerror="this.src='https://placehold.co/300x200/333333/FFFFFF?text=Model'">
                            <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 5px;">
                                ${editButton}
                            </div>
                        </div>
                        <div class="model-info">
                            <h3>${m.nazev}</h3>
                            <div class="model-price"><i class="fas fa-crown" style="color: #ffd700;"></i> ${m.cena} Kč</div>
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
        
        console.log('Mažu model ID:', id);
        
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
            alert('Chyba: ' + response.status + ' - ' + errorData);
            return;
        }
        
        console.log('Model smazán!');
        alert('Model byl úspěšně smazán!');
        await loadModels();
        
    } catch (error) {
        console.error('Chyba:', error);
        alert('Chyba: ' + error.message);
    }
}

async function loadStl() {
    try {
        const token = await getAccessToken();
        const headers = {
            'apikey': CONFIG.SUPABASE_KEY,
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/stl_soubory`, { headers });
        const data = await response.json();
        console.log('STL načteno:', data.length);
        
        const grid = document.getElementById('stlGrid');
        if (grid) {
            grid.innerHTML = '';
            
            if (data.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fas fa-box-open" style="font-size: 48px; color: var(--primary);"></i>
                        <p style="margin-top: 15px;">Zatím žádné STL soubory. Přidej první!</p>
                    </div>
                `;
                return;
            }
            
            data.forEach(s => {
                const editButton = isAdmin() ? 
                    `<button onclick="openEditStlModal(${s.id})" class="edit-btn" title="Upravit STL">
                        <i class="fas fa-pen"></i>
                    </button>` : 
                    '';
                
                grid.innerHTML += `
                    <div class="stl-card">
                        <div class="stl-image">
                            <img src="${s.obrazek || 'https://placehold.co/300x200/333333/FFFFFF?text=STL'}" 
                                 alt="${s.nazev}" 
                                 onerror="this.src='https://placehold.co/300x200/333333/FFFFFF?text=STL'">
                            <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 5px;">
                                ${editButton}
                            </div>
                        </div>
                        <div class="stl-info">
                            <h3>${s.nazev}</h3>
                            ${s.popis ? `<p class="stl-popis">${s.popis}</p>` : ''}
                            <a href="${s.stl_url}" target="_blank" class="btn-primary" style="width: 100%; justify-content: center; margin-top: 10px;">
                                <i class="fas fa-download"></i> Stáhnout STL
                            </a>
                        </div>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error('Chyba načítání STL:', error);
    }
}

document.getElementById('addStlForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = await getAccessToken();
    if (!token) {
        alert('Nejsi přihlášen!');
        return;
    }
    
    const stlFile = document.getElementById('stlFile');
    if (!stlFile || !stlFile.files || stlFile.files.length === 0) {
        alert('Vyber STL soubor!');
        return;
    }
    
    const stlUrl = await uploadStlFile(stlFile.files[0]);
    if (!stlUrl) return;
    
    const imageFile = document.getElementById('stlImageFile');
    let imageUrl = document.getElementById('stlObrazek')?.value || null;
    
    if (imageFile && imageFile.files && imageFile.files.length > 0) {
        const uploadedUrl = await uploadImage(imageFile.files[0]);
        if (uploadedUrl) {
            imageUrl = uploadedUrl;
        }
    }
    
    const nazev = document.getElementById('stlNazev');
    const popis = document.getElementById('stlPopis');
    
    if (!nazev) {
        alert('Chyba: Chybí název!');
        return;
    }
    
    const data = {
        nazev: nazev.value,
        popis: popis?.value || null,
        obrazek: imageUrl,
        stl_url: stlUrl
    };

    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/stl_soubory`, {
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
        
        alert('STL přidán!');
        loadStl();
        e.target.reset();
    } catch (error) {
        alert('Chyba: ' + error.message);
        console.error(error);
    }
});

async function openEditStlModal(id) {
    console.log('Otevírám editaci STL ID:', id);
    
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return;
        }
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/stl_soubory?id=eq.${id}`, {
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        const stl = data[0];
        
        if (!stl) {
            alert('STL nenalezen!');
            return;
        }
        
        const idEl = document.getElementById('editStlId');
        const nazevEl = document.getElementById('editStlNazev');
        const popisEl = document.getElementById('editStlPopis');
        const obrazekEl = document.getElementById('editStlObrazek');
        const fileEl = document.getElementById('editStlFile');
        const imageFileEl = document.getElementById('editStlImageFile');
        
        if (!idEl || !nazevEl) {
            console.error('Chybí elementy v edit formuláři!');
            alert('Chyba: Formulář pro editaci není kompletní!');
            return;
        }
        
        idEl.value = stl.id;
        nazevEl.value = stl.nazev;
        if (popisEl) popisEl.value = stl.popis || '';
        if (obrazekEl) obrazekEl.value = stl.obrazek || '';
        if (fileEl) fileEl.value = '';
        if (imageFileEl) imageFileEl.value = '';
        
        document.getElementById('editModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Chyba při načítání STL:', error);
        alert('Chyba: ' + error.message);
    }
}

document.getElementById('editStlForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('editStlId').value;
    const token = await getAccessToken();
    if (!token) {
        alert('Nejsi přihlášen!');
        return;
    }
    
    let stlUrl = null;
    const stlFile = document.getElementById('editStlFile');
    
    if (stlFile && stlFile.files && stlFile.files.length > 0) {
        const uploadedUrl = await uploadStlFile(stlFile.files[0]);
        if (uploadedUrl) {
            stlUrl = uploadedUrl;
        }
    }
    
    const imageFile = document.getElementById('editStlImageFile');
    let imageUrl = document.getElementById('editStlObrazek')?.value || null;
    
    if (imageFile && imageFile.files && imageFile.files.length > 0) {
        const uploadedUrl = await uploadImage(imageFile.files[0]);
        if (uploadedUrl) {
            imageUrl = uploadedUrl;
        }
    }
    
    const nazev = document.getElementById('editStlNazev');
    const popis = document.getElementById('editStlPopis');
    
    if (!nazev) {
        alert('Chyba: Chybí název!');
        return;
    }
    
    const data = {
        nazev: nazev.value,
        popis: popis?.value || null,
        obrazek: imageUrl
    };
    
    if (stlUrl) data.stl_url = stlUrl;

    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/stl_soubory?id=eq.${id}`, {
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
        
        alert('STL upraven!');
        closeEditModal();
        loadStl();
    } catch (error) {
        alert('Chyba: ' + error.message);
        console.error(error);
    }
});

async function deleteStlFromEdit() {
    const id = document.getElementById('editStlId').value;
    if (!id) {
        alert('Chyba: ID STL nebylo nalezeno!');
        return;
    }
    
    closeEditModal();
    
    if (!confirm('Opravdu smazat tento STL soubor?')) {
        return;
    }
    
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return;
        }
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/stl_soubory?id=eq.${id}`, {
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
        
        alert('STL smazán!');
        loadStl();
        
    } catch (error) {
        console.error('Chyba:', error);
        alert('Chyba: ' + error.message);
    }
}

async function loadProfile() {
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            document.getElementById('profileEmail').textContent = user.email;
            const role = user.user_metadata?.role || user.raw_user_meta_data?.role || 'user';
            const roleText = role === 'admin' ? 'Administrátor' : 'Uživatel';
            document.getElementById('profileRole').textContent = roleText;
            document.getElementById('profileRole').style.color = role === 'admin' ? '#ff6b00' : '#00cc66';
            
            if (role === 'admin') {
                document.getElementById('adminSection').style.display = 'block';
                loadUsers();
            }
        }
    } catch (error) {
        console.error('Chyba načítání profilu:', error);
    }
}

async function loadUsers() {
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return;
        }
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/admin/users`, {
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Chyba načítání uživatelů:', errorData);
            throw new Error('Nepodařilo se načíst uživatele');
        }
        
        const data = await response.json();
        console.log('Načteno uživatelů:', data.users?.length || 0);
        
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            
            if (!data.users || data.users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="loading">Žádní uživatelé</td></tr>`;
                return;
            }
            
            data.users.forEach(u => {
                const role = u.user_metadata?.role || u.raw_user_meta_data?.role || 'user';
                const roleText = role === 'admin' ? 'Administrátor' : 'Uživatel';
                const roleColor = role === 'admin' ? '#ff6b00' : '#00cc66';
                const isCurrentUser = u.email === currentUser?.email;
                
                tbody.innerHTML += `
                    <tr>
                        <td>${u.email} ${isCurrentUser ? '<span style="color: var(--primary); font-size: 12px;">(ty)</span>' : ''}</td>
                        <td style="color: ${roleColor};">${roleText}</td>
                        <td style="color: var(--text-secondary); font-size: 13px;">${new Date(u.created_at).toLocaleDateString('cs-CZ')}</td>
                        <td>
                            ${!isCurrentUser ? `<button onclick="logoutUserById('${u.id}')" class="btn-danger" style="padding: 5px 12px; font-size: 12px;">
                                <i class="fas fa-sign-out-alt"></i> Odhlásit
                            </button>` : '<span style="color: var(--text-muted); font-size: 12px;">Aktivní</span>'}
                        </td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Chyba načítání uživatelů:', error);
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" class="loading">Chyba načítání: ${error.message}</td></tr>`;
        }
    }
}

async function logoutUserById(userId) {
    if (!confirm('Opravdu chcete odhlásit tohoto uživatele?')) {
        return;
    }
    
    try {
        const token = await getAccessToken();
        if (!token) {
            alert('Nejsi přihlášen!');
            return;
        }
        
        const response = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Chyba při odhlašování:', errorData);
            alert('Chyba při odhlašování uživatele');
            return;
        }
        
        alert('Uživatel byl odhlášen!');
        loadUsers();
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
        if (document.getElementById('stlGrid')) {
            loadStl();
        }
        if (document.getElementById('totalFilaments') || document.getElementById('totalMeters')) {
            loadFilaments();
        }
        if (document.getElementById('profileEmail')) {
            loadProfile();
        }
    } else {
        console.error('Supabase není inicializován!');
    }
});