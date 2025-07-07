import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";

const capacities = ["48","96","144","288"];
const endpoint   = import.meta.env.VITE_GAS_ENDPOINT;        // tanpa ?mode

/* convert HH:MM => durasi */
const durasi = (s,e)=>{
  if(!s||!e) return "";
  const [h1,m1]=s.split(":").map(Number), [h2,m2]=e.split(":").map(Number);
  let diff=h2*60+m2 - (h1*60+m1); if(diff<0) diff+=1440;
  return `${Math.floor(diff/60)} jam ${diff%60} menit`;
};

const empty = {
  tanggal:"", hari:"", bulanTahun:"",
  userStart:"", userEnd:"", ticketStart:"", ticketEnd:"",
  durasiUser:"", durasiTicket:"",
  problem:"", action:"", joinClosure:"", pic:"", vendor:""
};

 function Osp(){
  const [form,setForm]=useState(empty);
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  /* ▼ ambil histori dari Google Sheet sekali saja */
  useEffect(()=>{
    fetch(`${endpoint}?mode=read`)
      .then(r=>r.json()).then(j=>setRows(j.records||[]))
      .catch(console.error);
  },[]);

  /* hitung durasi & tanggal helper */
  const update = ({target:{name,value}})=>{
    setForm(p=>{
      const n={...p,[name]:value};
      if(name==="tanggal"){
        const d=new Date(value);
        n.hari=d.toLocaleDateString("id-ID",{weekday:"long"});
        n.bulanTahun=d.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
      }
      n.durasiUser  = durasi(n.userStart ,n.userEnd);
      n.durasiTicket= durasi(n.ticketStart,n.ticketEnd);
      return n;
    });
  };

  /* kirim baris ke Sheet */
  const send = async data=>{
    const body=new URLSearchParams(data).toString();
    const r=await fetch(endpoint,{method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
    const j=await r.json(); if(!j.ok) throw new Error("Apps Script error");
  };

  const submit=async e=>{
    e.preventDefault(); setLoading(true); setError("");
    try{
      await send(form);           // kirim ke sheet
      setRows(r=>[...r,form]);    // tampil di tabel
      setForm(empty);
    }catch(err){setError(err.message);}finally{setLoading(false);}
  };

  const resetLocal=()=>{
    if(confirm("Hapus tabel di layar (tidak menghapus Google Sheet)?")){
      setRows([]);
    }
  };

  /* ---------------- UI ---------------- */
  return(
    <Container className="py-4">
      <h4 className="mb-3">Gangguan / Durasi OSP</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* -------- FORM -------- */}
      <Form onSubmit={submit} className="border p-3 rounded mb-4">
        {/* Tanggal */}
        <Row className="g-2 mb-2">
          <Col md={3}><Form.Control type="date" name="tanggal" value={form.tanggal} onChange={update} required/></Col>
          <Col md={2}><Form.Control type="text" value={form.hari} placeholder="Hari" readOnly/></Col>
          <Col md={3}><Form.Control type="text" value={form.bulanTahun} placeholder="Bulan/Tahun" readOnly/></Col>
        </Row>
        {/* User */}
        <h6>Jam Action User</h6>
        <Row className="g-2 mb-2">
          <Col md={2}><Form.Control type="time" name="userStart" value={form.userStart} onChange={update}/></Col>
          <Col md={2}><Form.Control type="time" name="userEnd"   value={form.userEnd}   onChange={update}/></Col>
          <Col md={3}><Form.Control value={form.durasiUser} readOnly placeholder="Durasi User"/></Col>
        </Row>
        {/* Ticket */}
        <h6>Jam Ticket Turun</h6>
        <Row className="g-2 mb-2">
          <Col md={2}><Form.Control type="time" name="ticketStart" value={form.ticketStart} onChange={update}/></Col>
          <Col md={2}><Form.Control type="time" name="ticketEnd"   value={form.ticketEnd}   onChange={update}/></Col>
          <Col md={3}><Form.Control value={form.durasiTicket} readOnly placeholder="Durasi Ticket"/></Col>
        </Row>
        {/* Problem & Action */}
        <Row className="g-2 mb-2">
          <Col md={4}><Form.Control name="problem" placeholder="Problem" value={form.problem} onChange={update}/></Col>
          <Col md={4}><Form.Control name="action"  placeholder="Action"  value={form.action}  onChange={update}/></Col>
        </Row>
        {/* Join Closure */}
        <Row className="g-2 mb-2">
          <Col md={4}>
            <Form.Control name="joinClosure" list="listJC" placeholder="Join Closure (opsional)" value={form.joinClosure} onChange={update}/>
            <datalist id="listJC">{capacities.map(c=><option key={c} value={c}/>)}</datalist>
          </Col>
        </Row>
        {/* PIC / Vendor + Tombol */}
        <Row className="g-2">
          <Col md={3}><Form.Control name="pic"    placeholder="PIC"    value={form.pic}    onChange={update}/></Col>
          <Col md={3}><Form.Control name="vendor" placeholder="Vendor" value={form.vendor} onChange={update}/></Col>
          <Col md={2} className="d-flex flex-column">
            <Button type="submit" disabled={loading} className="w-100 mb-2">
              {loading?"Mengirim…":"Tambah"}
            </Button>
            <Button variant="warning" className="w-100" onClick={resetLocal}>
              Reset Tabel
            </Button>
          </Col>
        </Row>
      </Form>

      {/* -------- TABEL -------- */}
      <Table striped bordered hover size="sm">
        <thead>
          <tr>{[
            "No","Tanggal","Hari","Bulan/Tahun",
            "User Start","User End","Durasi User",
            "Ticket Start","Ticket End","Durasi Ticket",
            "problem","action","join closure","pic","Vendor"
          ].map(h=><th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{i+1}</td>
              <td>{r.tanggal}</td><td>{r.hari}</td><td>{r.bulanTahun}</td>
              <td>{r.userStart}</td><td>{r.userEnd}</td><td>{r.durasiUser}</td>
              <td>{r.ticketStart}</td><td>{r.ticketEnd}</td><td>{r.durasiTicket}</td>
              <td>{r.problem}</td><td>{r.action}</td>
              <td>{r.joinClosure}</td><td>{r.pic}</td><td>{r.vendor}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default Osp;
