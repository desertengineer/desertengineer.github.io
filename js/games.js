function filterGames(category, event) {
  // Select all cards and buttons
  const cards = document.querySelectorAll('.game-card');
  const buttons = document.querySelectorAll('.filter-btn');
  
  // Remove 'active' class from all buttons
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Add 'active' class to the clicked button
  if (event) {
    event.target.classList.add('active');
  }

  // Loop through cards and filter based on category
  cards.forEach(card => {
    if (category === 'all' || card.classList.contains(category)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}