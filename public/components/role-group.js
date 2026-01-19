class RoleGroup extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._sponsors = [];
    }

    set sponsors(val) {
        this._sponsors = val;
        this.render();
    }

    render() {
        const name = this.getAttribute('name') || 'Role';

        this.shadowRoot.innerHTML = `
            <style>
                .section {
                    margin-bottom: 20px;
                }
                .role-title {
                    font-size: 1.4rem;
                    font-weight: 600;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .role-title::before {
                    content: '';
                    display: inline-block;
                    width: 4px;
                    height: 24px;
                    background: var(--accent-color, #5865F2);
                    border-radius: 2px;
                }
                .count {
                    font-size: 0.9rem;
                    color: #a0a0a8;
                    font-weight: 400;
                }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 16px;
                }
            </style>
            <div class="section">
                <div class="role-title">
                    ${name}
                    <span class="count">${this._sponsors.length} members</span>
                </div>
                <div class="grid" id="card-container"></div>
            </div>
        `;

        const container = this.shadowRoot.getElementById('card-container');
        this._sponsors.forEach(user => {
            const card = document.createElement('sponsor-card');
            card.data = user;
            container.appendChild(card);
        });
    }
}

customElements.define('role-group', RoleGroup);
