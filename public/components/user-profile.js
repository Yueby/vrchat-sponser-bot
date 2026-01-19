class UserProfile extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    set user(val) {
        this.render(val);
    }

    render(user) {
        const supportDays = user.supportDays || 0;
        const joinedDate = user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown';
        const bindDate = user.bindTime ? new Date(user.bindTime).toLocaleDateString() : 'Not bound';
        
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                .profile-card {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 40px;
                    text-align: center;
                }
                .avatar {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    border: 4px solid var(--accent-color, #5865F2);
                    margin-bottom: 20px;
                    box-shadow: 0 0 20px rgba(88, 101, 242, 0.3);
                }
                .name {
                    font-size: 2rem;
                    font-weight: 600;
                    margin-bottom: 8px;
                }
                .vrchat-name {
                    color: var(--accent-color, #5865F2);
                    font-size: 1.2rem;
                    margin-bottom: 24px;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 20px;
                    margin-top: 30px;
                    text-align: left;
                }
                .stat-item {
                    background: rgba(255, 255, 255, 0.03);
                    padding: 16px;
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .stat-label {
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .stat-value {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-top: 4px;
                }
                .badge-container {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 16px;
                }
                .badge {
                    background: rgba(88, 101, 242, 0.2);
                    color: #7289da;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .booster { background: rgba(255, 115, 250, 0.2); color: #ff73fa; }
                
                .history {
                    margin-top: 40px;
                    text-align: left;
                }
                .history h3 { margin-bottom: 16px; font-size: 1.1rem; }
                .history-list {
                    list-style: none;
                    border-left: 2px solid rgba(255, 255, 255, 0.1);
                    padding-left: 20px;
                }
                .history-item { margin-bottom: 12px; position: relative; }
                .history-item::before {
                    content: '';
                    position: absolute;
                    left: -27px;
                    top: 8px;
                    width: 12px;
                    height: 12px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                }
            </style>
            <div class="profile-card">
                <img class="avatar" src="${user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="Avatar">
                <div class="name">${user.displayName}</div>
                <div class="vrchat-name">VRChat: ${user.vrchatName || 'Not Bound'}</div>
                
                <div class="badge-container">
                    ${user.isBooster ? '<span class="badge booster">Server Booster</span>' : ''}
                    ${user.roles.map(r => `<span class="badge">${r}</span>`).join('')}
                    ${user.isExternal ? '<span class="badge">External Member</span>' : ''}
                </div>

                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Support Time</div>
                        <div class="stat-value">${supportDays} Days</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Joined At</div>
                        <div class="stat-value">${joinedDate}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Bound At</div>
                        <div class="stat-value">${bindDate}</div>
                    </div>
                </div>

                ${user.nameHistory && user.nameHistory.length > 0 ? `
                    <div class="history">
                        <h3>VRChat Name History</h3>
                        <ul class="history-list">
                            ${user.nameHistory.map(h => `
                                <li class="history-item">
                                    <div style="font-weight: 600;">${h.name}</div>
                                    <div style="color: var(--text-secondary); font-size: 0.8rem;">
                                        Changed at ${new Date(h.changedAt).toLocaleDateString()}
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('user-profile', UserProfile);
