import { Alert, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tooltip, Typography } from "@mui/material"
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useEffect, useState } from "react";
import api from "@/services/api";
import * as RestUrls from '../../../helpers/constants/RestUrls';
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import RitzModal from "@/components/Ritz/RitzModal";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";

interface LeftOverRowDetailsViewProps {
    expandedRowId: any;
    leftOverData: any[];
  }

const LeftOverRowDetailsView = ({expandedRowId, leftOverData, selectedId,handleRowExpand}: any) => {
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletingRow, setDeletingRow] = useState(null);
    const [localLeftOverData, setLocalLeftOverData] = useState(leftOverData);
    interface Material {
        id: number; 
      }

const handleDeleteModelOpen = (materialId:any) => {
    setIsDeleteModalOpen(true)
    setDeletingRow(materialId) 
    }

    const handleDeleteRow = () => {
        setIsDeleting(true);
        api.delete(RestUrls.allocatedLeftOverMaterialsDeleteURL(deletingRow))
            .then(response => {
                toast.success(DEFAULT_SUCCESS);
                // setLocalLeftOverData(prevData => prevData.filter((material: any) => material.id !== deletingRow)); // TODO Lakshan fix this
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {  
                setIsDeleting(false);
                setIsDeleteModalOpen(false);
            });
    };

const handleDeleteModelClose = () => {
    setIsDeleting(false)
    setIsDeleteModalOpen(false)
}

return(
    <>
    {localLeftOverData.length>0 ? (
           <TableContainer sx={{ overflowX: 'auto', paddingLeft: '74px' }}>
           <Table
               size="small"
               sx={{
                   paddingLeft: '200px',
                   minWidth: 650,
                   borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                   '& .MuiTableCell-head': {
                       color: (theme) => theme.palette.grey[700],
                       background: (theme) => theme.palette.grey[50],
                       width: '50px',
                   },
                   '& .MuiTableCell-body': {
                       width: '50px',
                   }
               }}
               aria-label="customized table"
           >
               <TableHead>
                   <TableRow>
                       <>
                       {localLeftOverData[0]?.material_type === 'fabric' ? (
                           <>
                               <TableCell>Batch Number</TableCell>
                               <TableCell>Width</TableCell>
                               <TableCell>Available Quantity</TableCell>
                               <TableCell></TableCell>
                           </>
                       ) : (
                           <>
                               <TableCell>Batch Number</TableCell>
                               <TableCell>Available Quantity</TableCell>
                               <TableCell></TableCell>
                           </>
                       )}
                       </>
                   </TableRow>
               </TableHead>
               <TableBody>
                   {localLeftOverData.map((material:any, index:any) => (
                       <TableRow key={index}>
                           {material.material_type === 'fabric' ? ( 
                               <>
                                   <TableCell>{material?.batch_number || '--'}</TableCell>
                                   <TableCell>{material?.width}</TableCell>
                                   <TableCell>
                                       {material?.quantity !== null && material?.quantity_units !== null
                                           ? `${material?.quantity ?? '--'} ${material?.quantity_units_display ?? ''}`
                                           : '--'}
                                   </TableCell>
                               </>
                           ) : (
                               <>
                                   <>
                                   <TableCell>{material?.batch_number || '--'}</TableCell>
                                   <TableCell>
                                       {material?.quantity !== null && material?.quantity_units !== null
                                           ? `${material?.quantity ?? '--'} ${material?.quantity_units ?? ''}`
                                           : '--'}
                                   </TableCell>
                                   </>
                               </>
                           )}
                           <TableCell sx={{ verticalAlign: 'middle'}}>
                               <Box sx={{ display: 'flex',justifyContent: 'center', flexDirection: 'row-reverse', alignItems: 'center',  height: '100%'}}>
                                   <>
                                       <Tooltip title="Delete Row" arrow>
                                           <DeleteOutlineIcon
                                               color="error"
                                               sx={{marginRight: '-0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                                               onClick={() => handleDeleteModelOpen(material.id)}
                                           />
                                       </Tooltip>
                                   </>
                               </Box>
                           </TableCell>
                       </TableRow>
                    ))}
               </TableBody>
           </Table>
       </TableContainer>
      ) : (
        <Alert severity='info' sx={{ mb: 2, marginTop: '2em' }}>
            No Details Available
        </Alert>
      )}

    {isDeleteModalOpen && <RitzModal
        open={isDeleteModalOpen}
        onClose={handleDeleteModelClose}
        maxWidth='xs'
        title='Confirm Delete'>
        <>
          <Box>
            <Typography>Are you sure you want to delete this ?</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
              <Button variant='contained' onClick={handleDeleteRow} color='error' disabled={isDeleting}>
                {isDeleting && <SaveSpinner/>}Delete
              </Button>
          </Box>
          </Box>
        </>
      </RitzModal>}
      </>
)
}

export default LeftOverRowDetailsView

