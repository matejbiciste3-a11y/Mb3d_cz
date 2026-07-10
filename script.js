if (typeof supabase === 'undefined') {
    console.error('❌ Supabase není inicializován!');
} else if (!supabase.auth) {
    console.error('❌ Supabase.auth neexistuje! Zkontroluj config.js');
} else {
    console.log('✅ Supabase připraven s auth');
}

let currentUser = null;

async function checkUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('❌ Chyba při získávání uživatele:', error);
            return false;
        }
        
        console.log('👤 Celý uživatel:', user);
        console.log('📦 user_metadata:', user?.user_metadata);
        console.log('📦 raw_user_meta_data:', user?.raw_user_meta_data);
        
        if (user) {
            let role = 'user';
            
            if (user.user_metadata?.role) {
                role = user.user_metadata.role;
            } else if (user.raw_user_meta_data?.role) {
                role = user.raw_user_meta_data.role;
            }
            
            console.log('✅ Role načtena:', role);
            
            currentUser = {
                email: user.email,
                role: role,
                id: user.id
            };
            
            showUserInfo();
            updateNav();
            checkPageAccess();
            
            return true;
        }
    } catch (e) {
        console.log('❌ Chyba při checkUser:', e);
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
        console.log('🔑 Pokus o přihlášení:', email);
        
        if (!supabase.auth) {
            throw new Error('Supabase.auth není dostupný!');
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('❌ Chyba přihlášení:', error);
            msg.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${error.message}`;
            msg.style.color = '#ff4444';
            return;
        }
        
        console.log('✅ Přihlášení úspěšné:', data);
        
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
        
        console.log('✅ Role nastavena:', role);
        
        msg.innerHTML = `<i class="fas fa-check-circle"></i> Přihlášení úspěšné! Role: ${role}`;
        msg.style.color = '#00cc66';
        
        setTimeout(() => {
            window.location.href = 'filamenty.html';
        }, 800);
    } catch (e) {
        console.error('❌ Chyba:', e);
        msg.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Chyba: ${e.message}`;
        msg.style.color = '#ff4444';
    }
});

async function logoutUser() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        location.reload();
    } catch (e) {
        console.error('❌ Chyba při odhlašování:', e);
    }
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
    
    console.log('🔐 Kontrola přístupu - cesta:', path);
    console.log('👤 Aktuální uživatel:', currentUser);
    console.log('🛡️ Je admin?', isAdmin());
    console.log('🔓 Je přihlášen?', isAuthenticated());
    
    if (!authGuard || !protectedContent) {
        console.log('⚠️ Stránka nemá authGuard nebo protectedContent');
        return true;
    }
    
    if (path.includes('index.html') || path.includes('login.html') || path === '/' || path === '') {
        console.log('✅ Veřejná stránka - přístup povolen');
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    if (path.includes('cenik.html') || path.includes('stl.html')) {
        if (!isAdmin()) {
            console.log('❌ Přístup zamítnut - vyžaduje admina');
            authGuard.style.display = 'flex';
            protectedContent.style.display = 'none';
            return false;
        }
        console.log('✅ Admin přístup povolen');
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    if (path.includes('filamenty.html') || path.includes('naklady.html')) {
        if (!isAuthenticated()) {
            console.log('❌ Přístup zamítnut - vyžaduje přihlášení');
            authGuard.style.display = 'flex';
            protectedContent.style.display = 'none';
            return false;
        }
        console.log('✅ Přihlášený uživatel - přístup povolen');
        authGuard.style.display = 'none';
        protectedContent.style.display = 'block';
        return true;
    }
    
    console.log('✅ Neznámá stránka - přístup povolen');
    authGuard.style.display = 'none';
    protectedContent.style.display = 'block';
    return true;
}

async function loadFilaments() {
    try {
        console.log('📦 Načítám filamenty...');
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty`, {
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
            }
        });
        const data = await response.json();
        console.log('📦 Načteno filamentů:', data.length);
        
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
                const deleteButton = isAdmin() ? 
                    `<button onclick="deleteFilament(${f.id})" class="delete-btn"><i class="fas fa-trash"></i></button>` : 
                    '';
                
                const progressColor = spotreba > 80 ? '#ff4444' : spotreba > 50 ? '#ffaa00' : '#00cc66';
                
                grid.innerHTML += `
                    <div class="filament-card">
                        <div class="filament-image">
                            <img src="${f.obrazek || 'https://placehold.co/150x150/333333/FFFFFF?text=3D'}" alt="${f.vyrobce} ${f.barva}" onerror="this.src='https://placehold.co/150x150/333333/FFFFFF?text=3D'">
                            ${deleteButton}
                        </div>
                        <div class="filament-info">
                            <h3>${f.vyrobce}</h3>
                            <p class="color" style="color: ${f.barva}">${f.barva}</p>
                            <p class="material"><i class="fas fa-cog"></i> ${f.material}</p>
                            <p class="weight"><i class="fas fa-weight"></i> ${f.kg} kg</p>
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
                    select.innerHTML += `<option value="${f.id}">${f.vyrobce} - ${f.barva} (${f.aktualni}m)</option>`;
                });
            }

            const totalFilaments = document.getElementById('totalFilaments');
            const totalMeters = document.getElementById('totalMeters');
            if (totalFilaments) totalFilaments.textContent = data.length;
            if (totalMeters) {
                const sum = data.reduce((acc, f) => acc + f.aktualni, 0);
                totalMeters.textContent = Math.round(sum);
            }
        }
    } catch (error) {
        console.error('❌ Chyba načítání filamentů:', error);
    }
}

document.getElementById('addFilamentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        vyrobce: document.getElementById('vyrobce').value,
        barva: document.getElementById('barva').value,
        material: document.getElementById('material').value,
        kg: parseFloat(document.getElementById('kg').value),
        zaklad: parseFloat(document.getElementById('zaklad').value),
        aktualni: parseFloat(document.getElementById('aktualni').value),
        obrazek: document.getElementById('obrazek').value || null
    };

    try {
        await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty`, {
            method: 'POST',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        alert('✅ Filament přidán!');
        loadFilaments();
        e.target.reset();
    } catch (error) {
        alert('❌ Chyba při přidávání');
        console.error(error);
    }
});

async function odecistFilament() {
    const id = document.getElementById('filamentSelect').value;
    const metry = parseFloat(document.getElementById('spotreba').value);
    
    if (!id || !metry) {
        document.getElementById('vysledek').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Vyber filament a zadej metry';
        return;
    }

    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty?id=eq.${id}`, {
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
            }
        });
        const data = await response.json();
        const aktualni = Math.max(0, data[0].aktualni - metry);

        await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ aktualni: aktualni })
        });

        document.getElementById('vysledek').innerHTML = `<i class="fas fa-check-circle"></i> Odečteno ${metry}m. Zbývá ${aktualni}m`;
        loadFilaments();
    } catch (error) {
        alert('❌ Chyba při odečítání');
        console.error(error);
    }
}

async function deleteFilament(id) {
    if (!confirm('Opravdu smazat tento filament?')) return;
    
    try {
        await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/filamenty?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': CONFIG.SUPABASE_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
            }
        });
        loadFilaments();
    } catch (error) {
        alert('❌ Chyba při mazání');
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

document.querySelector('.hamburger')?.addEventListener('click', function() {
    document.querySelector('nav ul').classList.toggle('open');
});

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Stránka načtena, inicializace...');
    
    if (typeof window.supabase !== 'undefined' && window.supabase) {
        console.log('✅ Supabase připraven, načítám uživatele...');
        await checkUser();
        
        if (document.getElementById('filamentGrid')) {
            console.log('📦 Načítám filamenty...');
            loadFilaments();
        }
    } else {
        console.error('❌ Supabase není inicializován! Zkontroluj config.js a pořadí skriptů.');
    }
});