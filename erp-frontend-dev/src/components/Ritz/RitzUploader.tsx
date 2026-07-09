import { Box, Button } from '@mui/material';
import React, { useEffect } from 'react';
import ImageUploading from 'react-images-uploading';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddToPhotosIcon from '@mui/icons-material/AddToPhotos';
import EditIcon from '@mui/icons-material/Edit';
const RitzUploader = ({ imagePath = null, deleteid = null, multiple, width, height, onChangeParent, onDeleteParent, imagesParent = [], disabled }: any) => {
    const [images, setImages] = React.useState([]);
    const maxNumber = 69;

    const onChange = (imageList: React.SetStateAction<any[]>, addUpdateIndex: any) => {

        setImages(imageList);
    };
    useEffect(() => {
        if (imagePath != null) {
            //   alert(imagePath)
            setImages([imagePath]);
        }
    }, [imagePath])

    useEffect(() => {
        if (images.length > 0) {
            onChangeParent(images);

        }
    }, [images])

    useEffect(() => {
        if (imagesParent.lenght > 0) {
            setImages(imagesParent);
        }
    }, [imagesParent])


    return (
        <Box className="App">
            <ImageUploading
                multiple={multiple}
                value={images}
                onChange={onChange}
                maxNumber={maxNumber}
                dataURLKey="data_url"
            //maxFileSize={122683355}
            >
                {({
                    imageList,
                    onImageUpload,
                    onImageRemoveAll,
                    onImageUpdate,
                    onImageRemove,
                    isDragging,
                    dragProps,

                }) => (
                    <Box className="upload__image-wrapper">
                        {
                            images.length < 1 ? (
                                <Button style={isDragging ? { color: 'red' } : undefined} onClick={onImageUpload} {...dragProps} disabled={disabled} >
                                    <AddPhotoAlternateIcon />
                                </Button>
                            ) : null

                        }
                        {imageList.map((image, index) => (
                            <Box key={index} style={{ width: "100%", height: "100%" }} className="image-item">
                                {image['data_url'] == null && <img src={imagePath} alt="no-image" width={width} height={height} />}
                                {image['data_url'] != null && <img src={image['data_url']} alt="no-image" width={width} height={height} />}
                                <Box className="image-item__btn-wrapper">
                                    {!disabled && (
                                        <>
                                            <Button variant='outlined' size="small" style={{ marginRight: "10px" }} onClick={() => onImageUpdate(index)}><EditIcon /></Button>
                                            <Button variant='outlined' size="small" color="error" onClick={() => { onImageRemove(index), onDeleteParent(index) }}><DeleteForeverIcon /></Button>

                                        </>
                                    )}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </ImageUploading>
        </Box>
    );
};

export default RitzUploader;