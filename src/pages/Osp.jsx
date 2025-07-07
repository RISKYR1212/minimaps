// src/pages/Osp.jsx
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";

const capacities = ["48","96","144","288"];

/* ---------- state awal ---------- */
const initialForm = {
  userStart:"", userEnd:"",
  ticketStart:"", ticketEnd:"",
  durasiUser:"", durasiTicket:"",
  problem:"", action:"",
  joinClosure:"",              // ← NEW
  pic:"", vendor:"",
};

const calc = (s,e)=>{
  if(!s||!e) return "";
  const [h1,m1] = s.split(":").map(Number);
  const [h2,m2] = e.split(":").map(Number);
  let diff = h2*60+m2 - (h1*60+m1);
  if(diff<0) diff += 24*60;
  return `${Math.floor(diff/60)} jam ${diff%60} menit`;
};

function Osp(){
  const [form,setForm] = useState(initialForm);
  const [rows,setRows] = useState(()=>JSON.parse(localStorage.getItem("osp")||"[]"));
  const [loading,setLd] = useState(false);
  const [error,setErr]  = useState("");

  useEffect(()=>localStorage.setItem("osp",JSON.stringify(rows)),[rows]);

  const handleChange = e =>{
    const {name,value} = e.target;
    setForm(prev=>{
      const next = {...prev,[name]:value};
      next.durasiUser   = calc(next.userStart,   next.userEnd);
      next.durasiTicket = calc(next.ticketStart, next.ticketEnd);
      return next;
    });
  };

  const GAS = import.meta.env.VITE_GAS_ENDPOINT;
  const send = async payload=>{
    const body = new URLSearchParams(payload).toString();
    const res  = await fetch(GAS,{method:"POST",headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
    const data = await res.json();
    if(!res.ok||!data.ok) throw new Error("Apps Script error");
  };

  const submit = async e=>{
    e.preventDefault(); setLd(true); setErr("");
    try{
      await send(form);
      setRows(r=>[...r,form]);
      setForm(initialForm);
    }catch(err){console.error(err); setErr("Gagal kirim ke Sheet");}
    finally{ setLd(false); }
  };

  /* UI */
  return(
    <Container className="py-4">
      <h4 className="mb-3">Durasi Gangguan OSP</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      <Form onSubmit={submit} className="border p-3 rounded mb-4">

        {/* Action User */}
        <h6>Jam Action User</h6>
        <Row className="g-2 mb-2">
          <Col md={2}><Form.Control type="time" name="userStart" value={form.userStart} onChange={handleChange}/></Col>
          <Col md={2}><Form.Control type="time" name="userEnd"   value={form.userEnd}   onChange={handleChange}/></Col>
          <Col md={3}><Form.Control type="text" value={form.durasiUser} readOnly placeholder="Durasi User"/></Col>
        </Row>

        {/* Ticket Turun */}
        <h6>Jam Ticket Turun</h6>
        <Row className="g-2 mb-2">
          <Col md={2}><Form.Control type="time" name="ticketStart" value={form.ticketStart} onChange={handleChange}/></Col>
          <Col md={2}><Form.Control type="time" name="ticketEnd"   value={form.ticketEnd}   onChange={handleChange}/></Col>
          <Col md={3}><Form.Control type="text" value={form.durasiTicket} readOnly placeholder="Durasi Ticket"/></Col>
        </Row>

        {/* Problem / Action */}
        <Row className="g-2 mb-2">
          <Col md={4}><Form.Control name="problem" placeholder="Problem" value={form.problem} onChange={handleChange}/></Col>
          <Col md={4}><Form.Control name="action"  placeholder="Action"  value={form.action}  onChange={handleChange}/></Col>
        </Row>

        {/* Join Closure Capacity */}
        <Row className="g-2 mb-2">
          <Col md={4}>
            <Form.Select name="joinClosure" value={form.joinClosure} onChange={handleChange}>
              <option value="">Join Closure Capacity</option>
              {capacities.map(c=><option key={c} value={c}>{c}</option>)}
            </Form.Select>
          </Col>
        </Row>

        {/* PIC / Vendor */}
        <Row className="g-2">
          <Col md={3}><Form.Control name="pic"    placeholder="PIC"    value={form.pic}    onChange={handleChange}/></Col>
          <Col md={3}><Form.Control name="vendor" placeholder="Vendor" value={form.vendor} onChange={handleChange}/></Col>
          <Col md={2} className="d-flex align-items-end">
            <Button type="submit" className="w-100" disabled={loading}>
              {loading?"Mengirim...":"Tambah"}
            </Button>
          </Col>
        </Row>
      </Form>

      {/* Tabel */}
      <Table striped bordered hover size="sm">
        <thead>
          <tr>{[
            "No","Durasi User","Durasi Ticket",
            "Problem","Action","Join Closure","PIC","Vendor"
          ].map(h=><th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{i+1}</td>
              <td>{r.durasiUser}</td>
              <td>{r.durasiTicket}</td>
              <td>{r.problem}</td>
              <td>{r.action}</td>
              <td>{r.joinClosure}</td>
              <td>{r.pic}</td>
              <td>{r.vendor}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}



export default Osp;
