    document.addEventListener('DOMContentLoaded', () => {
            // Set current year in footer
            document.getElementById('current-year').textContent = new Date().getFullYear();

            // Mobile Hamburger Menu Toggle
            const hamburgerBtn = document.getElementById('hamburger-btn');
            const mobileMenu = document.getElementById('mobile-menu');

            hamburgerBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
            });
        });