import { Box, Button, IconButton } from '@mui/material';
import React, { useState, useEffect } from 'react';
import AttachmentIcon from '@mui/icons-material/Attachment';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DownloadIcon from '@mui/icons-material/Download';
import api from '@/services/api';
import * as RestUrls from '../../helpers/constants/RestUrls';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


function MultipleFileUpload({ displayType, selectedFilesParent, handleFileChangeParent, filelocation, isReadOnly=false }: any) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [thumbnails, setThumbnails] = useState([]);
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const filesfrominput = event.target.files;
        const files = Array.from(filesfrominput || []);
        const uploadData = new FormData();
        uploadData.append('location', filelocation);

        files.forEach(file => {
            uploadData.append('files', file);
        });


        api.post(RestUrls.uploadFileURL(), uploadData).then(resp => {
                const responseData = resp?.data || [];
                const newSelectedFiles = [...selectedFiles, ...responseData];
                setSelectedFiles(newSelectedFiles);
                handleFileChangeParent(newSelectedFiles);     

            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
                // TODO ERROR
                if (error.response && error.response.data) {
                    const errorMsg = error.response.data;
                } else {
                    // Handle other error cases
                }
            });
            
    };
    
    const handleFileRemove = (deleteIndex: number) => {
        const selectedFilesCopy = [...selectedFiles];
        if (selectedFilesCopy?.[deleteIndex]) {
            selectedFilesCopy.splice(deleteIndex, 1);
        }
        setSelectedFiles(selectedFilesCopy);
        handleFileChangeParent(selectedFilesCopy);
    };

    const handleFileDownload = (file: any) => {
        const downloadLink = document.createElement('a');
        downloadLink.href = file.file_path;
        downloadLink.target = '_blank';
        downloadLink.rel = 'noopener noreferrer';
        downloadLink.setAttribute('download', file?.display_name);
        downloadLink.click();

    };

    const fileInputStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        cursor: 'pointer',
    };

    const thumbnailStyle: React.CSSProperties = {
        width: '50px',
        height: '50px',
        cursor: 'pointer',
    };

    const attachmentContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        marginRight: '20px',
    };

    useEffect(() => {
        const generateThumbnails = () => {
            // const thumbnailPromises = selectedFiles?.map((file: any) => {
            //     return new Promise<string>((resolve, reject) => {
            //         if (file.file_path.endsWith('.pdf')) {
            //             resolve('http://127.0.0.1:8000/api/shared/static/images/icons/pdf-48.png');
            //         } else if (file.file_path.endsWith('.xlsx') || file.file_path.endsWith('.csv')) {
            //             resolve('http://127.0.0.1:8000/api/shared/static/images/icons/excel-48.png');
            //         } else {
            //             resolve(file.file_path);
            //         }
            //     });
            // });

            // Promise.all(thumbnailPromises)
            //     .then((results) => {
            //         setThumbnails(results);
            //     })
            //     .catch((error) => {
            //         console.error('Error generating thumbnails:', error);
            //     });
        };

        generateThumbnails();
        
    }, [selectedFiles]);

    useEffect(() => {
        setSelectedFiles([...selectedFilesParent]);
    }, [selectedFilesParent]);




    return (
        <Box>
            <Button disabled={isReadOnly}>
                <input type="file" multiple onChange={(event) => { handleFileChange(event); event.target.value = null;}} style={fileInputStyle} />
                <AttachmentIcon />
                Attach Files
            </Button>
            {Array.isArray(selectedFiles) && selectedFiles.length > 0 && (
                <Box>
                    {displayType === 'listView' && selectedFiles.map((file: any, index: any) => (
                        <Box key={`ritz-multi-uploader-${index}`} style={{ display: 'flex', alignItems: 'center' }}>
                            <Box style={{ marginRight: '5px' }}>
                            <IconButton color="error" onClick={() => handleFileRemove(index)}>
                            <DeleteForeverIcon />
                        </IconButton>
                            </Box>
                            <Box>
                                <span style={{ color: 'blue', cursor: 'pointer' }} onClick={() => handleFileDownload(file)}>{file?.display_name?.slice(0, 10)}</span>
                            </Box>
                        </Box>
                    ))}
                    {displayType === 'thumbnailView' && selectedFiles.map((file: any, index: any) => (
                        <Box key={`ritz-multi-uploader-thumbnail-${index}`} style={attachmentContainerStyle}>
                            <span style={{ marginLeft: '5px', verticalAlign: 'middle', textDecoration: 'underline', color: 'blue', cursor: 'pointer' }} onClick={() => handleFileDownload(file)}>
                            {file?.display_name.slice(0, 10)}
                            </span>
                            {thumbnails[index] && (
                                <Box style={{ display: 'flex', alignItems: 'center' }}>
                                    <IconButton color="secondary" onClick={() => handleFileRemove(index)}>
                                        <DeleteForeverIcon />
                                    </IconButton>
                                    <img src={thumbnails[index]} alt="Thumbnail" style={thumbnailStyle} onClick={() => handleFileDownload(file)} />
                                </Box>
                            )}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}

export default MultipleFileUpload;