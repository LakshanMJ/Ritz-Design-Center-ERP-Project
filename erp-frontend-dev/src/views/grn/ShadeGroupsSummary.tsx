import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Card, CardHeader, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import RitzUploader from '@/components/Ritz/RitzUploader';
import RitzImageUploader from '@/components/Ritz/RitzImageUploader';
import { THUMBNAILVIEW } from '@/helpers/constants/FileUpload';

const ShadeGroupSummary = ({ sourceId, sourceDataUrl, imageUpdloadUrl }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [shadeGroupsDetails, setShadeGroupsDetails] = useState([]);
  const fileLocation = 'grn/actual_shade/attachments'; // TODO - change this

  const fetchData = () => {
    if (sourceId > 0) {
      setIsLoading(true);
      const requests = [
        api.get(sourceDataUrl(sourceId)),
      ]
      Promise.all(requests).then((resp) => {
        const respData = resp.map(r => r.data);
        const [shadeGroupDetails] = respData
        setShadeGroupsDetails([...shadeGroupDetails]);
      })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };

  const handleImage = (materialId:any, shadeGroupId: any, shadeGroupeName: any, images: any) => {
    if (images[0]?.id != null) {
      const dataToSend = {
        id: shadeGroupId || null,
        shade_name: shadeGroupeName,
        attachment: images[0]
      };
      api.post(imageUpdloadUrl(), dataToSend).then(resp => {
        console.log(resp)
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
    }
  };

  const handleDelteImage = (shadeId: any) => {
    //Todo
  };

  useEffect(() => {
    if (sourceId) {
      fetchData();
    }
  }, []);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
            {shadeGroupsDetails.length === 0 && (
                <Alert severity="info">Shade groups are not available at the moment</Alert>
            )}
          <TableContainer>
            {shadeGroupsDetails.map((material: any, materialIndex: number) => (
              <React.Fragment key={materialIndex}>
                <Card variant="outlined" sx={{ mb: 3, mt: 1 }} key={materialIndex}>
                  <CardHeader
                    title={material?.ritz_customer_brand_reference_code}
                    sx={{
                      background: (theme) => theme.palette.grey[100],
                      fontWeight: 'bold',
                      borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                    }}
                  ></CardHeader>
                  <Grid container spacing={1}>
                    {material.shade_groups && material.shade_groups.length > 0 ? (
                      material.shade_groups.map((shadeGroup: any, shadeGroupIndex: number) => (
                        <Grid item xs={3} sm={2} key={shadeGroupIndex}>
                          <Card sx={{ mb: 1, mt: 1, ml: 1, mr: 1 }}>
                            <Table aria-label="simple table">
                              <TableBody>
                                <TableRow><TableCell sx={{ textAlign: 'center' }}>{shadeGroup.shade_name}</TableCell></TableRow>
                                <TableRow><TableCell sx={{ textAlign: 'center' }}>
                                  {/* <RitzUploader
                                    imagePath={shadeGroup?.shade_swatch?.file_path}
                                    multiple={false}
                                    width={100}
                                    height={100}
                                    onChangeParent={(images: any) => handleImage(shadeGroup.id, shadeGroup.shade_name, images)}
                                    onDeleteParent={(index: any) => handleDelteImage(shadeGroup.id)} /> */}
                                  <RitzImageUploader
                                    displayType={THUMBNAILVIEW}
                                    selectedFilesParent={[shadeGroup.attachment] || []}
                                    handleFileChangeParent={(images: any) => handleImage(material.id, shadeGroup.id, shadeGroup.shade_name, images)}
                                    thumbnailWidth="200px"
                                    thumbnailHeight="200px"
                                    filelocation={fileLocation} />
                                </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </Card>
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12} sx={{ mb: 1 }}>
                        <Typography sx={{ mt: 1 }} variant="body1" align="center">No available shade groups</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Card>
              </React.Fragment>
            ))}
          </TableContainer>
        </>
      )}
    </>
  );
};

export default ShadeGroupSummary;
