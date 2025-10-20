import React from 'react';
import './Filters.css';

function Filters() {
  // La logica di filtro verrà aggiunta qui
  return (
    <div className="filters-container">
      <h3>Filtra Giocate</h3>
      <div className="filter-options">
        <select name="time-filter">
          <option value="all">Tutte</option>
          <option value="5">Ultime 5</option>
          <option value="10">Ultime 10</option>
          <option value="20">Ultime 20</option>
        </select>
        <input type="month" name="month-filter" />
        <button className="btn-secondary">Applica</button>
      </div>
    </div>
  );
}

export default Filters;
