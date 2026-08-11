import React, { useState, useEffect } from 'react';
import { uploadDocument, fetchDocuments, deleteDocument } from '../services/api';
import { Upload, Trash2, FileText } from 'lucide-react';

export default function DocumentPanel() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadDocs = async () => {
        try {
            const data = await fetchDocuments();
            setDocs(data || []);
        } catch(e) { console.error(e); }
    };

    useEffect(() => { loadDocs(); }, []);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            await uploadDocument(file);
            loadDocs();
        } catch(err) { alert('Upload failed'); }
        setLoading(false);
        // Clear the file input so the same file can be re-uploaded if needed
        e.target.value = '';
    };

    const handleDelete = async (id) => {
        await deleteDocument(id);
        loadDocs();
    };

    return (
        <div className="glass-panel" style={{ padding: '16px', margin: '16px' }}>
            <h3 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>DOCUMENTS</h3>
            <label className="glass-button" style={{ display: 'inline-flex', cursor: 'pointer', marginBottom: '12px' }}>
                <Upload size={16} /> Upload PDF/DOCX
                <input type="file" accept=".pdf,.docx" onChange={handleUpload} hidden />
            </label>
            {loading && <div style={{ color: '#06b6d4' }}>Processing...</div>}
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {docs.map(doc => (
                    <li key={doc.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={14} color="#06b6d4" />
                            <span style={{ fontSize: '13px' }}>{doc.filename}</span>
                        </div>
                        <button className="glass-button" style={{ padding: '4px 8px' }} onClick={() => handleDelete(doc.id)}>
                            <Trash2 size={14} />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}