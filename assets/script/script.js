function switchRole(role) {
  const buttons = document.querySelectorAll('.role-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  document.querySelectorAll('.role-view').forEach(view => view.classList.remove('active'));
  document.getElementById(`view-${role}`).classList.add('active');
}
function updateCalc() {
  const price = document.getElementById('calcTrade').value;
  const amount = document.getElementById('calcAmount').value || 1;
  const total = price * amount;
  document.getElementById('calcOutput').innerText = `Becsült munkadíj: ~ ${total.toLocaleString('hu-HU')} Ft`;
}