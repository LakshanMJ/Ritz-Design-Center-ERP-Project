import { Box, Button, Card, CardHeader, Checkbox, Grid, Link, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import VisibilityIcon from '@mui/icons-material/Visibility';
import NextLink from "next/link";
import * as frontEndUrls from "@/helpers/constants/FrontEndUrls";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import * as RestUrls from '@/helpers/constants/RestUrls';
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";

const AssignLeftOver = ({costingVersionId,customerBrandMaterialId,clubId,handleClose,currentState,handleRowExpand}:any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [allocationMaterialData, setAllocationMaterialData] = useState([]);
    const [selectedIds, setSelectedIds] = useState({
        in_house_material_ids: []
      });
    const [formValidationErrors, setFormValidationErrors] = useState({ hasErrors: false });
    const [isSaving, setIsSaving] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [isDisabled, setIsDisabled] = useState(true);
    
    const fetchData = (costingVersionId:any,customerBrandMaterialId:any)=>{
        api.get(RestUrls.allocationMaterialListURL(costingVersionId,customerBrandMaterialId,rowsPerPage)).then(resp => {
         const data = resp?.data|| [];
         setAllocationMaterialData(data);
       }).catch(error => {
         toast.error(getDefaultError(error?.response?.status));
       }).finally(() => setIsLoading(false));
     }
    
    useEffect(() => {
        fetchData(costingVersionId,customerBrandMaterialId)
    }, []); 
    
    const handleCheckboxChange = (materialId: number) => {
        setSelectedIds(prevState => {
          const { in_house_material_ids } = prevState;
          return {
            in_house_material_ids: in_house_material_ids.includes(materialId)
              ? in_house_material_ids.filter(id => id !== materialId)
              : [...in_house_material_ids, materialId]
          };
        });
      };

    const handleAssignClick = () =>{
        const saveApi = RestUrls.allocatedLeftOverMaterialsSaveURL(clubId, customerBrandMaterialId);
            api.post(saveApi, selectedIds).then(resp => {
                toast.success(DEFAULT_SUCCESS);
                if (handleClose) handleClose();
            }).catch(error => {
                setFormValidationErrors(error.response?.data);
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsSaving(false);
            });
    }

    const handleChangePage = (event:any, newPage:any) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event:any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedData = allocationMaterialData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    useEffect(() => {
        if (currentState === 'open' || currentState === 'pending_materials_review') {
            setIsDisabled(false);
        }
      }, [currentState]);

return (

    <Grid container spacing={2}>

      <Grid item xs={12} sm={12} md={12}>
      <Box display="flex" justifyContent="flex-end" marginBottom={2}>
            <Button variant="contained" color="primary" onClick={handleAssignClick} disabled={isDisabled}>
                Assign
            </Button>
        </Box>
            <Table>
                <TableHead>
                    <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Select</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Ritz Reference Code</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Supplier</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Original Costing</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Available Quantity</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>View</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                {paginatedData.map((material: any, index: any) => (
                    <TableRow key={index}>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                            <Checkbox
                                onChange={() => handleCheckboxChange(material.id)}
                            />
                        </TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material?.material_details?.attributes?.ritz_customer_brand_reference_code}</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material?.supplier_name}</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material?.costing_version_display_number}</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{`${material?.available_quantity} ${material?.available_quantity_units_display}`}</TableCell>
                        
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center',verticalAlign: 'middle', }}>
                            <Tooltip title="View Details">
                            {material?.club_id ? (
                                <Link
                                    component={NextLink}
                                    target="_blank"
                                    href={frontEndUrls.virtualWarehouseViewURL(material?.id)}
                                    sx={{ display: 'inline-flex', alignItems: 'center' }}
                                >
                                    <VisibilityIcon sx={{ cursor: 'pointer' }} />
                                </Link>
                                ) : (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', opacity: 0.5 }}>
                                    <VisibilityIcon sx={{ cursor: 'not-allowed' }} />
                                </Box>
                            )}
                            </Tooltip>
                        </TableCell>
                        
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            <TablePagination
                        component="div"
                        count={allocationMaterialData.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[50, 100, 200]}
                    />
      </Grid>
  </Grid>
)}

export default AssignLeftOver;