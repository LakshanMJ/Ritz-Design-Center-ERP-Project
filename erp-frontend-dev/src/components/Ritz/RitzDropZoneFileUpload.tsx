import React, { useRef, useState } from 'react';
import { Typography, Box, IconButton } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

const RitzDropZoneFileUpload = ({ onUpload, multi }: any) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleDragOver = (event: any) => {
    event.preventDefault();
  };

  const handleDrop = (event: any) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    updateSelectedFiles(files);
  };

  const handleFileSelect = (event: any) => {
    const files = Array.from(event.target.files);
    updateSelectedFiles(files);
  };

  const updateSelectedFiles = (files: any) => {
    setSelectedFiles(files);
    if (onUpload) {
        onUpload(files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    if (onUpload) {
        onUpload(newFiles);
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box sx={{mb: 2}}>
      <input
        style={{ display: 'none' }}
        id="raised-button-file"
        multiple={multi}
        type="file"
        onChange={handleFileSelect}
        ref={fileInputRef}
      />
      <Box
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
            border: (theme: any) => `1px dashed ${theme.palette.grey[400]}`,
            borderRadius: 1,
            padding: 2,
            marginTop: 2,
          }}          
      >
       <Box sx={{textAlign: 'center', color: (theme: any) => theme.palette.grey[500]}}>
            <Typography>Drag and drop any file here or click</Typography>
            <CloudUploadIcon sx={{ cursor: 'pointer', fontSize: '50px' }} onClick={openFileDialog} />
       </Box>
      </Box>
        <Box sx={{ listStyle: 'none', padding: 0, mt: 2  }}>
            {selectedFiles.map((file, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: '8px' }}>
                <IconButton onClick={() => removeFile(index)} aria-label="delete" color='error' sx={{ fontSize: '25px'}}>
                    <DeleteIcon sx={{ fontSize: '20px' }} />
                </IconButton>
                <Typography sx={{ fontSize: '16px', marginRight: '4px' }}>{file.name}</Typography>
              </Box>
            ))}
        </Box>
    </Box>
  );
};

export default RitzDropZoneFileUpload;
