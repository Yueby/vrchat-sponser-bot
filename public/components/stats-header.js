class StatsHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['total', 'roles-count'];
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const total = this.getAttribute('total') || '0';
        const roles = this.getAttribute('roles-count') || '0';

        this.shadowRoot.innerHTML = `
            <style>
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                h1 {
                    font-size: 2.5rem;
                    font-weight: 600;
                    margin-bottom: 30px;
                    background: linear-gradient(135deg, #fff 0%, #a0a0a8 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .stats-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                }
                .stat-box {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    padding: 24px;
                    backdrop-filter: blur(10px);
                }
                .label {
                    color: #a0a0a8;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .value {
                    font-size: 2rem;
                    font-weight: 600;
                    margin-top: 5px;
                }
            </style>
            <div class="header">
                <h1>VRChat Sponsor Dashboard</h1>
                <div class="stats-container">
                    <div class="stat-box">
                        <div class="label">Total Sponsors</div>
                        <div class="value">${total}</div>
                    </div>
                    <div class="stat-box">
                        <div class="label">Active Roles</div>
                        <div class="value">${roles}</div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('stats-header', StatsHeader);
