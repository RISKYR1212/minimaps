import React, { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Form, InputGroup, Badge, Alert } from 'react-bootstrap';
import {
  Trash,
  GripVertical,
  FileEarmarkText,
  ArrowLeft,
  CheckCircle,
  FilePdf,
  FileExcel,
  PlusCircle,
  ListUl,
  Upload
} from 'react-bootstrap-icons';

const fieldTypes = [
  { id: '1', label: 'Text Input', type: 'text', icon: 'text-left' },
  { id: '2', label: 'Checkbox', type: 'checkbox', icon: 'check-square' },
  { id: '3', label: 'Date Picker', type: 'date', icon: 'calendar' },
  { id: '4', label: 'Textarea', type: 'textarea', icon: 'textarea' },
  { id: '5', label: 'Dropdown', type: 'select', icon: 'list-ul' },
  { id: '6', label: 'Radio Group', type: 'radio', icon: 'ui-radios' },
  { id: '7', label: 'Number', type: 'number', icon: '123' },
  { id: '8', label: 'File Upload', type: 'file', icon: 'upload' }
];

const Fastfield = () => {
  const [formFields, setFormFields] = useState([]);
  const [formTitle, setFormTitle] = useState('My Custom Form');
  const [formDescription, setFormDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const formRef = useRef();

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;

    if (result.source.droppableId === 'fields' && result.destination.droppableId === 'form-canvas') {
      const draggedField = fieldTypes.find(f => f.id === result.draggableId);
      const newField = {
        ...draggedField,
        id: `field-${Date.now()}`,
        required: false,
        placeholder: '',
        options: ['Option 1', 'Option 2'],
        accept: draggedField.type === 'file' ? 'image/*,.pdf,.doc,.docx' : undefined,
        multiple: draggedField.type === 'file' ? false : undefined
      };

      const updatedFields = [...formFields];
      updatedFields.splice(result.destination.index, 0, newField);
      setFormFields(updatedFields);
    } else if (
      result.source.droppableId === 'form-canvas' &&
      result.destination.droppableId === 'form-canvas'
    ) {
      const updatedFields = [...formFields];
      const [removed] = updatedFields.splice(result.source.index, 1);
      updatedFields.splice(result.destination.index, 0, removed);
      setFormFields(updatedFields);
    }
  };

  const updateFieldProperty = (fieldId, property, value) => {
    setFormFields(formFields.map(field =>
      field.id === fieldId ? { ...field, [property]: value } : field
    ));
  };

  const removeField = (fieldId) => {
    setFormFields(formFields.filter(field => field.id !== fieldId));
    const newUploadedFiles = { ...uploadedFiles };
    delete newUploadedFiles[fieldId];
    setUploadedFiles(newUploadedFiles);
  };

  const addOption = (fieldId) => {
    setFormFields(formFields.map(field =>
      field.id === fieldId
        ? {
          ...field,
          options: [...field.options, `Option ${field.options.length + 1}`]
        }
        : field
    ));
  };

  const removeOption = (fieldId, optionIndex) => {
    setFormFields(formFields.map(field =>
      field.id === fieldId
        ? {
          ...field,
          options: field.options.filter((_, idx) => idx !== optionIndex)
        }
        : field
    ));
  };

  const updateOption = (fieldId, optionIndex, value) => {
    setFormFields(formFields.map(field =>
      field.id === fieldId
        ? {
          ...field,
          options: field.options.map((opt, idx) =>
            idx === optionIndex ? value : opt
          )
        }
        : field
    ));
  };

  const handleFileUpload = async (fieldId, e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    
    const processedFiles = await Promise.all(
      Array.from(files).map(file => {
        return new Promise((resolve) => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => resolve({
              file,
              preview: e.target.result,
              type: 'image'
            });
            reader.readAsDataURL(file);
          } else {
            resolve({
              file,
              preview: null,
              type: file.type.split('/')[1] || 'file'
            });
          }
        });
      })
    );

    setUploadedFiles(prev => ({
      ...prev,
      [fieldId]: processedFiles
    }));

    setUploadStatus(prev => ({
      ...prev,
      [fieldId]: 'uploading'
    }));

    
    const totalSize = processedFiles.reduce((sum, item) => sum + item.file.size, 0);
    let uploadedSize = 0;

    const progressInterval = setInterval(() => {
      uploadedSize += totalSize * 0.1;
      if (uploadedSize >= totalSize) {
        uploadedSize = totalSize;
        clearInterval(progressInterval);
        setUploadStatus(prev => ({
          ...prev,
          [fieldId]: 'completed'
        }));
      }
      setUploadProgress(prev => ({
        ...prev,
        [fieldId]: Math.min(100, (uploadedSize / totalSize) * 100)
      }));
    }, 300);
  };

  const exportToPDF = async () => {
    const element = formRef.current;

    
    const clone = element.cloneNode(true);

    
    const fileContainers = clone.querySelectorAll('.file-upload-container');
    fileContainers.forEach(container => {
      const fieldId = container.id.replace('file-container-', '');
      if (uploadedFiles[fieldId]) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'file-preview-pdf';

        uploadedFiles[fieldId].forEach(item => {
          const fileDiv = document.createElement('div');
          fileDiv.className = 'mb-2';

          const fileName = document.createElement('div');
          fileName.textContent = `📄 ${item.file.name} (${Math.round(item.file.size / 1024)} KB)`;
          fileDiv.appendChild(fileName);

          if (item.preview) {
            const img = document.createElement('img');
            img.src = item.preview;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '150px';
            img.style.border = '1px solid #ddd';
            img.style.borderRadius = '4px';
            img.style.marginTop = '5px';
            fileDiv.appendChild(img);
          }

          previewDiv.appendChild(fileDiv);
        });

        
        container.parentNode.replaceChild(previewDiv, container);
      }
    });

   
    const elementsToHide = clone.querySelectorAll('.progress, .alert, .upload-status, .file-input');
    elementsToHide.forEach(el => el.style.display = 'none');

    
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    document.body.appendChild(clone);

   
    const canvas = await html2canvas(clone, {
      scale: 2, 
      logging: false,
      useCORS: true 
    });

    document.body.removeChild(clone);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${formTitle.replace(/\s+/g, '_')}.pdf`);
  };

  const exportToExcel = () => {
    const data = formFields.map((field, index) => ({
      '#': index + 1,
      'Field Type': field.label,
      'Required': field.required ? 'Yes' : 'No',
      'Options': field.options ? field.options.join(', ') : 'N/A',
      'Uploaded Files': uploadedFiles[field.id]
        ? uploadedFiles[field.id].map(item =>
          `${item.file.name} (${Math.round(item.file.size / 1024)} KB, ${item.type})`
        ).join('\n')
        : 'None',
      'Accept Types': field.accept || 'Any',
      'Multiple Files': field.multiple ? 'Yes' : 'No'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Form Fields');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([excelBuffer], { type: 'application/octet-stream' }),
      `${formTitle.replace(/\s+/g, '_')}.xlsx`
    );
  };

  const resetForm = () => {
    setFormFields([]);
    setFormTitle('My Custom Form');
    setFormDescription('');
    setUploadedFiles({});
    setUploadProgress({});
    setUploadStatus({});
  };

  const renderFieldPreview = (field) => {
    switch (field.type) {
      case 'text':
        return (
          <Form.Control
            type="text"
            placeholder={field.placeholder || 'Text input'}
            disabled
          />
        );
      case 'checkbox':
        return (
          <Form.Check
            type="checkbox"
            label="Checkbox option"
            disabled
          />
        );
      case 'date':
        return <Form.Control type="date" disabled />;
      case 'textarea':
        return (
          <Form.Control
            as="textarea"
            rows={3}
            placeholder={field.placeholder || 'Textarea'}
            disabled
          />
        );
      case 'select':
        return (
          <Form.Select disabled>
            {field.options.map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </Form.Select>
        );
      case 'radio':
        return (
          <div>
            {field.options.map((opt, idx) => (
              <Form.Check
                key={idx}
                type="radio"
                name={`radio-${field.id}`}
                label={opt}
                disabled
              />
            ))}
          </div>
        );
      case 'number':
        return <Form.Control type="number" disabled />;
      case 'file':
        return (
          <div id={`file-container-${field.id}`} className="file-upload-container">
            <Form.Control
              type="file"
              className="file-input"
              onChange={(e) => handleFileUpload(field.id, e)}
              accept={field.accept}
              multiple={field.multiple}
            />
            {uploadedFiles[field.id] && (
              <div className="mt-2">
                <small>Selected files:</small>
                <ul className="list-unstyled">
                  {uploadedFiles[field.id].map((item, idx) => (
                    <li key={idx} className="text-muted mb-2">
                      <CheckCircle size={12} className="me-1 text-success" />
                      {item.file.name} ({Math.round(item.file.size / 1024)} KB)
                      {item.preview && (
                        <div className="mt-2">
                          <img
                            src={item.preview}
                            alt={`Preview ${idx}`}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '150px',
                              border: '1px solid #ddd',
                              borderRadius: '4px'
                            }}
                            className="img-thumbnail"
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {uploadStatus[field.id] === 'uploading' && (
                  <div className="mt-2 upload-status">
                    <div className="progress" style={{ height: '5px' }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        style={{ width: `${uploadProgress[field.id] || 0}%` }}
                        aria-valuenow={uploadProgress[field.id] || 0}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                    <small className="text-muted">Uploading... {Math.round(uploadProgress[field.id] || 0)}%</small>
                  </div>
                )}
                {uploadStatus[field.id] === 'completed' && (
                  <Alert variant="success" className="mt-2 py-1 px-2 upload-status">
                    <small>Upload completed successfully!</small>
                  </Alert>
                )}
                {uploadStatus[field.id] === 'failed' && (
                  <Alert variant="danger" className="mt-2 py-1 px-2 upload-status">
                    <small>Upload failed. Please try again.</small>
                  </Alert>
                )}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Container fluid className="py-4">
      <style>
        {`
          .file-preview-pdf div {
            margin-bottom: 10px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
            border: 1px solid #dee2e6;
          }
          .file-input {
            display: none;
          }
          .img-thumbnail {
            padding: 4px;
            background-color: #fff;
          }
        `}
      </style>

      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="mb-0">
              <FileEarmarkText className="me-2" />
              Report 
            </h1>
            <div>
              <Button variant="danger" onClick={resetForm} className="me-2">
                <Trash className="me-1" /> Reset
              </Button>
              <Button variant="success" onClick={exportToPDF} className="me-2">
                <FilePdf className="me-1" /> Export PDF
              </Button>
              <Button variant="primary" onClick={exportToExcel}>
                <FileExcel className="me-1" /> Export Excel
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label> Title </Form.Label>
                <Form.Control
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Enter form title"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label> Description (Optional) </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Enter form description"
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Row>
          <Col md={4}>
            <Card className="sticky-top" style={{ top: '20px' }}>
              <Card.Header className="bg-primary text-white">
                <ListUl className="me-2" />
                Available Fields
              </Card.Header>
              <Card.Body>
                <Droppable droppableId="fields" isDropDisabled={true}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {fieldTypes.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-2 p-2 border rounded bg-light d-flex align-items-center"
                            >
                              <GripVertical className="me-2 text-muted" />
                              {field.label}
                              {field.type === 'file' && <Upload className="ms-auto text-muted" />}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </Card.Body>
            </Card>
          </Col>

          <Col md={8}>
            <Card ref={formRef}>
              <Card.Header className="bg-secondary text-white">
                <FileEarmarkText className="me-2" />
                Form Preview
                <Badge bg="light" text="dark" className="ms-2">
                  {formFields.length} fields
                </Badge>
              </Card.Header>
              <Card.Body>
                <h2 className="text-center mb-3">{formTitle}</h2>
                {formDescription && (
                  <p className="text-center text-muted mb-4">{formDescription}</p>
                )}

                <Droppable droppableId="form-canvas">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {formFields.length === 0 ? (
                        <div className="text-center py-5 border rounded bg-light">
                          <ArrowLeft size={48} className="mb-3 text-muted" />
                          <h5 className="text-muted"> Tarik Ksini dan susun dengan rapi </h5>
                          <p className="text-muted"> Tarik Mass.... </p>
                        </div>
                      ) : (
                        <Form>
                          {formFields.map((field, index) => (
                            <Draggable key={field.id} draggableId={field.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="mb-4 p-3 border rounded bg-white"
                                >
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div
                                      className="d-flex align-items-center text-muted"
                                      {...provided.dragHandleProps}
                                    >
                                      <GripVertical className="me-2" />
                                      <small>{field.label}</small>
                                    </div>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => removeField(field.id)}
                                    >
                                      <Trash size={14} />
                                    </Button>
                                  </div>

                                  <Form.Group className="mb-3">
                                    <Form.Label>Field Label</Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={field.label}
                                      onChange={(e) =>
                                        updateFieldProperty(field.id, 'label', e.target.value)
                                      }
                                    />
                                  </Form.Group>

                                  {['text', 'textarea'].includes(field.type) && (
                                    <Form.Group className="mb-3">
                                      <Form.Label> Placeholder Text </Form.Label>
                                      <Form.Control
                                        type="text"
                                        value={field.placeholder}
                                        onChange={(e) =>
                                          updateFieldProperty(field.id, 'placeholder', e.target.value)
                                        }
                                      />
                                    </Form.Group>
                                  )}

                                  {field.type === 'file' && (
                                    <>
                                      <Form.Group className="mb-3">
                                        <Form.Label> Accepted File Types </Form.Label>
                                        <Form.Control
                                          type="text"
                                          value={field.accept}
                                          onChange={(e) =>
                                            updateFieldProperty(field.id, 'accept', e.target.value)
                                          }
                                          placeholder="image/*,.pdf,.doc,.docx"
                                        />
                                        <Form.Text className="text-muted">
                                          Comma separated file extensions (e.g. image/*,.pdf)
                                        </Form.Text>
                                      </Form.Group>
                                      <Form.Check
                                        type="switch"
                                        id={`multiple-${field.id}`}
                                        label="Allow multiple files"
                                        checked={field.multiple}
                                        onChange={(e) =>
                                          updateFieldProperty(field.id, 'multiple', e.target.checked)
                                        }
                                        className="mb-3"
                                      />
                                    </>
                                  )}

                                  <Form.Check
                                    type="switch"
                                    id={`required-${field.id}`}
                                    label="Required field"
                                    checked={field.required}
                                    onChange={(e) =>
                                      updateFieldProperty(field.id, 'required', e.target.checked)
                                    }
                                    className="mb-3"
                                  />

                                  <div className="mb-3">
                                    <Form.Label> Preview: </Form.Label>
                                    {renderFieldPreview(field)}
                                  </div>

                                  {['select', 'radio'].includes(field.type) && (
                                    <div className="mt-3">
                                      <Form.Label> Options </Form.Label>
                                      {field.options.map((option, optIdx) => (
                                        <InputGroup key={optIdx} className="mb-2">
                                          <Form.Control
                                            type="text"
                                            value={option}
                                            onChange={(e) =>
                                              updateOption(field.id, optIdx, e.target.value)
                                            }
                                          />
                                          <Button
                                            variant="outline-danger"
                                            onClick={() => removeOption(field.id, optIdx)}
                                          >
                                            <Trash size={14} />
                                          </Button>
                                        </InputGroup>
                                      ))}
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => addOption(field.id)}
                                      >
                                        <PlusCircle size={14} className="me-1" />
                                        Add Option
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </Form>
                      )}
                    </div>
                  )}
                </Droppable>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </DragDropContext>
    </Container>
  );
};

export default Fastfield;