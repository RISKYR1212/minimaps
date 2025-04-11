import React from 'react';

const Home = () => {
  return (
    <div>
      <div id="carouselExampleInterval" className="carousel slide" data-bs-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active" data-bs-interval="10000">
            <img src="https://tse4.mm.bing.net/th?id=OIP.UYmuwIxRJGvoEelfr5BBHQHaEK&pid=Api&P=0&h=180" className="d-block w-100" alt="Slide 1" />
          </div>
          <div className="carousel-item" data-bs-interval="2000">
            <img src="https://tse3.mm.bing.net/th?id=OIP.hk75vd99Twsu7xUdhFW1xgHaEK&pid=Api&P=0&h=180" className="d-block w-100" alt="Slide 2" />
          </div>
          <div className="carousel-item">
            <img src="https://tse3.mm.bing.net/th?id=OIP.L1AGkZn_IqqPdViFMhCt-wHaD4&pid=Api&P=0&h=180" className="d-block w-100" alt="Slide 3" />
          </div>
        </div>
        <button className="carousel-control-prev" type="button" data-bs-target="#carouselExampleInterval" data-bs-slide="prev">
          <span className="carousel-control-prev-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Previous</span>
        </button>
        <button className="carousel-control-next" type="button" data-bs-target="#carouselExampleInterval" data-bs-slide="next">
          <span className="carousel-control-next-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Next</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
