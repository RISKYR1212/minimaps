import React from 'react';
import { Carousel } from 'react-bootstrap';

const Home = () => {
  return (
    <div>
      <Carousel fade interval={3000} pause={false}>
        <Carousel.Item>
          <img className="d-block w-100" src="https://img.freepik.com/free-vector/successful-partnership-negotiation-partners-handshaking_335657-2453.jpg?t=st=1744489227~exp=1744492827~hmac=3b06da676a9b65a34935687a1b065f3400fcf481ab88535bdfb7e45c274e662b&w=996" alt="Slide 1" />
        </Carousel.Item>
        <Carousel.Item>
          <img
            className="d-block w-100"
            src="https://img.freepik.com/free-vector/businessman-table-using-laptop-with-ethernet-connection-ethernet-connection-lan-connection-technology-ethernet-network-system-concept_335657-2287.jpg"
            alt="Slide 2"
          />
        </Carousel.Item>

        <Carousel.Item>
          <img
            className="d-block w-100"
            src="https://img.freepik.com/free-vector/modern-technology-composition-with-isometric-view_23-2147940847.jpg"
            alt="Slide 3"
          />
        </Carousel.Item>
      </Carousel>
      {/* Custom navigation */}
      {/* <button
        className="carousel-control-next"
        type=" "
        onClick={() => document.querySelector('.carousel').carousel('next')}
        style={{
          fontStyle: 'revert-layer',
          position: 'absolute',
          top: '50%',
          left: '800px',
          backgroundColor: 'rgba(16, 161, 187, 0.4)',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          fontWeight: 'bold',
          textAlign: 'center'
          // textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)'
        }}
      >
        BISMILLAHHIRRAHMANIRRAHIM
      </button> */}
    </div>
  );
};

export default Home;
