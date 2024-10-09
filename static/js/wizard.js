let userMood = '';
let userFood = '';

function setMood(mood) {
    userMood = mood;
    document.querySelectorAll('#mood-buttons button').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
}

function setFood(food) {
    userFood = food;
    document.querySelectorAll('#food-buttons button').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    if (userMood && userFood) {
        window.location.href = `/?mood=${userMood}&food=${userFood}`;
    }
}
