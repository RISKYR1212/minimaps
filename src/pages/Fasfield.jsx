import React, { useState } from 'react';

const Fasfield = () => {
  const [formData, setFormData] = useState({
    hari: '',
    tanggal: '',
    wilayah: '',
    area: '',
    temuan: '',
    tindakan: '',
    hasil: '',
    keterangan: '',
    dokumen: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      dokumen: e.target.files[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== '') {
        if (key === 'dokumen' && value) {
          formDataToSend.append('dokumen', value);
        } else {
          formDataToSend.append(key, value);
        }
      }
    });

    try {
      // Replace with your actual Google Apps Script URL
      const response = await fetch('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec', {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        alert('Data inspeksi berhasil disimpan!');
        setFormData({
          hari: '',
          tanggal: '',
          wilayah: '',
          area: '',
          temuan: '',
          tindakan: '',
          hasil: '',
          keterangan: '',
          dokumen: null
        });
        document.getElementById('file-input').value = '';
      } else {
        throw new Error('Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan saat menyimpan data');
    }
  };

  // Inline styles to replace CSS
  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    },
    header: {
      textAlign: 'center',
      marginBottom: '20px'
    },
    formRow: {
      display: 'flex',
      gap: '20px',
      marginBottom: '15px'
    },
    formGroup: {
      flex: 1,
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold'
    },
    input: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px'
    },
    textarea: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      minHeight: '80px',
      resize: 'vertical'
    },
    select: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      height: '40px'
    },
    submitButton: {
      backgroundColor: '#4285f4',
      color: 'white',
      padding: '10px 15px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      width: '100%',
      marginTop: '10px'
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Form Laporan Inspeksi</h2>
      <form onSubmit={handleSubmit}>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Hari:</label>
            <select 
              name="hari" 
              value={formData.hari} 
              onChange={handleChange}
              required
              style={styles.select}
            >
              <option value="">Pilih Hari</option>
              <option value="Senin">Senin</option>
              <option value="Selasa">Selasa</option>
              <option value="Rabu">Rabu</option>
              <option value="Kamis">Kamis</option>
              <option value="Jumat">Jumat</option>
              <option value="Sabtu">Sabtu</option>
              <option value="Minggu">Minggu</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Tanggal:</label>
            <input 
              type="date" 
              name="tanggal" 
              value={formData.tanggal} 
              onChange={handleChange} 
              required 
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Wilayah:</label>
            <input 
              type="text" 
              name="wilayah" 
              value={formData.wilayah} 
              onChange={handleChange} 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Area:</label>
            <input 
              type="text" 
              name="area" 
              value={formData.area} 
              onChange={handleChange} 
              required 
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Temuan:</label>
          <textarea 
            name="temuan" 
            value={formData.temuan} 
            onChange={handleChange} 
            required 
            style={styles.textarea}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Tindakan:</label>
          <textarea 
            name="tindakan" 
            value={formData.tindakan} 
            onChange={handleChange} 
            required 
            style={styles.textarea}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Hasil:</label>
          <select 
            name="hasil" 
            value={formData.hasil} 
            onChange={handleChange}
            required
            style={styles.select}
          >
            <option value="">Pilih Hasil</option>
            <option value="Baik">Baik</option>
            <option value="Perlu Perbaikan">Perlu Perbaikan</option>
            <option value="Darurat">Darurat</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Keterangan:</label>
          <textarea 
            name="keterangan" 
            value={formData.keterangan} 
            onChange={handleChange} 
            style={styles.textarea}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Dokumen Pendukung:</label>
          <input 
            id="file-input"
            type="file" 
            name="dokumen" 
            onChange={handleFileChange} 
            style={styles.input}
          />
        </div>

        <button type="submit" style={styles.submitButton}>Simpan PDF</button>
      </form>
    </div>
  );
};

export default Fasfield;