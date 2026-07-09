import React, { useEffect, useState } from "react";
import router, { useRouter } from "next/router";
import api from "@/services/api";
import * as poRestUrls from "@/helpers/constants/rest_urls/POUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import DefaultLoader from "@/components/DefaultLoader";
import { Box, Button, Grid, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme } from "@mui/material";
import CreatableSelect from "react-select/creatable";
import SaveSpinner from "@/components/SaveSpinner";
import { poClubShadeListURL, poClubShadeMappingDetailsURL, savePoClubShadeMappingDetailsURL } from "@/helpers/constants/rest_urls/GrnUrls";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import CustomOptionsList from "@/components/CustomOptionsList";
import FormErrorMessage from "@/components/FormErrorMessage";
import NextLink from 'next/link';
import { purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls";
import CustomerBrandMaterialDetail from '@/views/settings/userdefine_material/MaterialDetail';

const POClubShadeMapping = ({ grnId }: any) => {
  const router = useRouter();
  const theme = useTheme()
  const keyHelper = new ReactKeyHelper();
  const [shadeMappingDetails, setShadeMappingDetails] = useState([]);
  const [errorsList, setErrorsList] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showMaterialDetails, setShowMaterialDetails] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);

  const fetchData = () => {
    const requests = [
      api.get(poClubShadeMappingDetailsURL(grnId)),
    ];
    Promise.all(requests).then(response => {
      const respData = response.map(r => r.data);
      const [shadeMappingDetails] = respData;
      setShadeMappingDetails([...shadeMappingDetails])
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
    });
  }

  const handleSave = () => {
    setIsSaving(true);
    const savePayload = {
      data: shadeMappingDetails.map((poClub: any) => ({
        id: poClub?.id,
        materials: poClub?.materials?.map((material: any) => ({
          id: material.id,
          shade_mappings: material?.shade_mappings?.map((shade: any) => ({
            id: shade?.id,
            po_club_shade: shade?.po_club_shade ? {
              id: shade?.po_club_shade?.id,
              shade_name: shade?.po_club_shade?.shade_name
            } : null,
          })),
        }))
      })),
    };
    const request = {
      method: 'post',
      url: savePoClubShadeMappingDetailsURL(grnId),
      data: savePayload
    }
    api(request).then(() => {
      toast.success(DEFAULT_SUCCESS);
      setErrorsList({})
      fetchData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      setErrorsList({ ...error?.response?.data })
    }).finally(() => setIsSaving(false));
  };

  const handleCreateSelectChange = (selectedOption: any, shadePoClubIndex: number, materialIndex: number, shadeDetailIndex: number, materialId: any, shadeDetailId: any) => {
    const isNewOption = selectedOption.__isNew__;
    const updatedShadeMappingDetails = [...shadeMappingDetails];
    const updatedShadeMappings = [...updatedShadeMappingDetails[shadePoClubIndex].materials[materialIndex].shade_mappings];
    updatedShadeMappings[shadeDetailIndex] = {
      ...updatedShadeMappings[shadeDetailIndex],
      po_club_shade: {
        ...updatedShadeMappings[shadeDetailIndex].po_club_shade,
        id: isNewOption ? `new_po_shade_${selectedOption.value}` : selectedOption.value,
        shade_name: selectedOption.label,
        attachment: { file_path: selectedOption.image }
      },
    };
    updatedShadeMappingDetails[shadePoClubIndex].materials[materialIndex].shade_mappings = updatedShadeMappings;
    
    if (isNewOption) {
      const addingNewObject = {
          id: `new_po_shade_${selectedOption.value}`,
          attachment: null as any,
          shade_name: selectedOption.label,
      };
      updatedShadeMappingDetails[shadePoClubIndex].materials[materialIndex].club_shades.push(addingNewObject);
  }
      
    setShadeMappingDetails(updatedShadeMappingDetails);
  };

  const getShadeOptions = (clubShades: any) => {
    if (clubShades) {
      return clubShades?.map((shade: { shade_name: any; id: any; attachment: { file_path: any; }; }) => ({
        label: shade.shade_name,
        value: shade.id,
        image: shade.attachment ? shade.attachment.file_path : ''
      }));
    }
    return [];
  };

  const handleReferenceCodeDetailOnClick = (openState: boolean, materialId: any) => {
    setShowMaterialDetails(openState);
    setSelectedMaterialId(materialId);
  }


  const handleModalClose = () => {
    setShowMaterialDetails(false)
  }

  useEffect(() => {
    if (grnId) {
      fetchData();
    }

  }, [grnId]);

  return (
    <>
      {showMaterialDetails &&
        <CustomerBrandMaterialDetail
          customerBrandMaterialReferenceCodeId={selectedMaterialId}
          modalOpen={showMaterialDetails}
          setModalOpen={handleModalClose}
        />
      }
      {isLoading ? <DefaultLoader /> :
        <Box>
          {shadeMappingDetails?.map((shadePoClub: any, shadePoClubIndex: any) => (
            <React.Fragment key={keyHelper.getNextKeyValue()}>
              <Box sx={{ mb: 1, mt: 1 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }} color='primary'>
                 <Link target="_blank" component={NextLink} href={purchaseOrderClubDetailsPageURL(shadePoClub?.id)}>{shadePoClub.display_number}</Link>
                </Typography>
              </Box>
              <Box sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Table sx={{ width: '100%' }}>
                      <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '25%' }}>Mateiral</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '25%' }}>Supplier PO Shades</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '50%' }}>PO Club Shades</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {shadePoClub?.materials?.map((material: any, materialIndex: any) => (
                          material?.shade_mappings?.map((shadeDetail:any, shadeDetailIndex: any)=>( 
                            <TableRow key={keyHelper.getNextKeyValue()}>
                              {shadeDetailIndex == 0 && (
                                <TableCell rowSpan={material?.shade_mappings?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%', textAlign:'center' }}>
                                <Link
                                  sx={{ cursor: 'pointer' }}
                                  onClick={() => handleReferenceCodeDetailOnClick(true, material?.attributes?.customer_brand_material_id)}
                                  target="_blank"
                                >
                                  {material?.attributes?.ritz_customer_brand_reference_code}
                                </Link>
                              </TableCell>
                              )}
                              
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>{shadeDetail?.shade_name} </TableCell>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                <Grid container spacing={2} alignItems="center">
                                  <Grid item xs={12} md={6}>
                                    <CreatableSelect
                                      options={getShadeOptions(material.club_shades)}
                                      value={getShadeOptions(material.club_shades).find((opt: any) => opt.value === shadeDetail?.po_club_shade?.id)}
                                      onChange={(selectedOption) => handleCreateSelectChange(selectedOption, shadePoClubIndex, materialIndex, shadeDetailIndex, material.id, shadeDetail.id )}
                                      menuPosition={'fixed'}
                                      styles={{
                                        option: (provided, state) => ({
                                          ...provided,
                                          backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                                          color: 'black',
                                          ':hover': {
                                            backgroundColor: '#F0F0F0',
                                          },
                                        }),
                                        control: (provided) => ({
                                          ...provided,
                                          height: '50px',
                                          borderColor: '#ccc',
                                          boxShadow: 'none',
                                        }),
                                      }}
                                      components={{
                                        Option: (props) => <CustomOptionsList {...props} />,
                                      }}
                                    />
                                    <FormErrorMessage message={errorsList?.po_club_errors?.[shadePoClub.id]?.[material.id]?.[shadeDetailIndex]} />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    {shadeDetail?.po_club_shade?.attachment?.file_path && (
                                      <img
                                        src={shadeDetail?.po_club_shade?.attachment?.file_path}
                                        alt="Preview"
                                        style={{ width: '100%', maxWidth: '80px', height: '80px', objectFit: 'cover' }}
                                      />
                                    )}
                                  </Grid>
                                </Grid>
                              </TableCell>
                            </TableRow>
                             ))
                          ))}
                       
                      </TableBody>
                    </Table>
                  </Grid>
                </Grid>
              </Box>
            </React.Fragment>
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant='contained' disabled={isSaving} onClick={handleSave}>
              {isSaving && <SaveSpinner />} Save
            </Button>
          </Box>
        </Box>
      }

    </>
  )
}

export default POClubShadeMapping;
