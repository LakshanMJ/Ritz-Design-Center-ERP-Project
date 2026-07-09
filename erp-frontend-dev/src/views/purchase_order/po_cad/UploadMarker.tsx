import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import { Box, Button, Typography } from '@mui/material'
import * as POUrls from '@/helpers/constants/rest_urls/POUrls';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import RitzCheckBox from '@/components/Ritz/RitzCheckBox';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CostingCard from '@/components/OrderInquiry/Costing/CostingCard';
import RitzSingleFileUploader from '@/components/Ritz/RitzSingleFileUploader';
import { LISTVIEW } from '@/helpers/constants/FileUpload';
import FormErrorMessage from '@/components/FormErrorMessage';


const UploadMarker = ({ materialId, clubId, customerBrandMaterialId, onUploadChangesSuccess }: any) => {
   
    const areaFileAttachmentLocation = `cad/marker/area`;
    const miniMarkerFileAttachmentLocation = `cad/marker/mini_marekr`;

    const [isLoading, setIsLoading] = useState(false);
    const [selectedUploadFiles, setSelectedUploadFiles] = useState<any>({ area_file: null, mini_marker_file: null });
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<any>({});

    const handleFileChange = (attachments: any, filed: any) => {
        const attachment = attachments.length > 0 ? attachments[0] : null;
        setSelectedUploadFiles((prevState: any) => ({
            ...prevState,
            [filed]: attachment,
        }));
    };

    const handleNextButtonAction = () => {
        setIsSaving(true);
        const selectedFileData = {
            area_file: selectedUploadFiles?.area_file?.id || null,
            mini_marker_file: selectedUploadFiles?.mini_marker_file?.id || null ,
        }
        api.post(POUrls.poMarkerUploadURL(clubId,customerBrandMaterialId), selectedFileData).then(resp => {
            const responseData = resp?.data || [];
            toast.success(DEFAULT_SUCCESS);
            onUploadChangesSuccess(responseData)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors({...error?.response?.data})
           
        }).finally(() => {
            setIsSaving(false);
        });
    }

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <Box sx={{ mt: 3, }}>
                    <CostingCard>
                        <Box>
                            <Typography variant='h6' sx={{ mb: 1 }}>Area File :</Typography>
                            <RitzSingleFileUploader
                                displayType={LISTVIEW}
                                selectedFilesParent={selectedUploadFiles?.area_file ? [selectedUploadFiles?.area_file] : []}
                                handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles, 'area_file')}
                                filelocation={areaFileAttachmentLocation}
                            />
                             <FormErrorMessage message={errors?.area_file?.[0]} />
                        </Box>
                        <Box sx={{mt:1}}>
                            <Typography variant='h6' sx={{ mb: 1 }}>Mini Marker File :</Typography>
                            <RitzSingleFileUploader
                                displayType={LISTVIEW}
                                selectedFilesParent={selectedUploadFiles?.mini_marker_file ? [selectedUploadFiles?.mini_marker_file] : []}
                                handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles, 'mini_marker_file')}
                                filelocation={miniMarkerFileAttachmentLocation}
                            />
                            <FormErrorMessage message={errors?.mini_marker_file?.[0]} />
                        </Box>
                    </CostingCard>
                    <Button variant="contained" onClick={handleNextButtonAction} sx={{ paddingLeft: '2%', paddingRight: '2%', float: 'right' }}>{isSaving ? <SaveSpinner /> : <> </>}Next</Button>
                </Box>
            </>}
        </>
    )
}

export default UploadMarker