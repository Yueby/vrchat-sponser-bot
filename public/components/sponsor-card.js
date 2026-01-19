class SponsorCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    set data(val) {
        this.render(val);
    }

    render(user) {
        const supportDays = user.supportDays || 0;
        const joinedDate = user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                .card:hover {
                    transform: translateY(-5px);
                    background: rgba(255, 255, 255, 0.07);
                    border-color: rgba(88, 101, 242, 0.4);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }
                .avatar {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid rgba(255, 255, 255, 0.1);
                }
                .info {
                    flex: 1;
                    min-width: 0;
                }
                .name {
                    font-weight: 600;
                    font-size: 1.1rem;
                    color: #fff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .meta {
                    font-size: 0.85rem;
                    color: #a0a0a8;
                    margin-top: 2px;
                }
                .badge {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(88, 101, 242, 0.2);
                    color: #7289da;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .booster {
                    background: rgba(255, 115, 250, 0.2);
                    color: #ff73fa;
                }
            </style>
            <div class="card">
                <img class="avatar" src="${user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="${user.vrchatName}">
                <div class="info">
                    <div class="name">${user.vrchatName}</div>
                    <div class="meta">Supported for ${supportDays} days</div>
                </div>
                ${user.isBooster ? '<span class="badge booster">Booster</span>' : ''}
                ${user.isExternal ? '<span class="badge">External</span>' : ''}
            </div>
        `;
    }
}

customElements.define('sponsor-card', SponsorCard);
