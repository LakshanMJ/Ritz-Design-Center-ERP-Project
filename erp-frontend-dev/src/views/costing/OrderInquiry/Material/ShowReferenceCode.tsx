import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {useState} from "react";
import MaterialDetail from "@/views/settings/userdefine_material/DetailView";
import CustomerBrandMaterialDetail from "@/views/settings/userdefine_material/MaterialDetail";
import {Typography} from "@mui/material";


const ShowMaterialReferenceCode = ({ materialAttributes, customerBrandMaterialId, headerInformation }: any) => {

    const [showDetails, setShowDetails] = useState(false);

    const handleReferenceCodeDetailOnClick = (openState: boolean) => {
        setShowDetails(openState);
    }

    const getDisplayReferenceCode = () => {
        let displayValue = materialAttributes?.[headerInformation['name']];
        console.log(customerBrandMaterialId, '---><>')
        if (!displayValue && customerBrandMaterialId) {
            displayValue = "N/A"
        } else if (!displayValue) {
            displayValue = "--";
        }
        return displayValue;
    }

    return (
        <>
            <Typography sx={{whiteSpace: 'nowrap'}}>
                {getDisplayReferenceCode()}
                { customerBrandMaterialId &&
                    <>
                        <OpenInNewIcon
                            sx={{position: 'relative', top: '5px', color: 'rgb(25, 118, 210)'}}
                            onClick={() => handleReferenceCodeDetailOnClick(true)} />

                        { showDetails &&
                            <CustomerBrandMaterialDetail
                                customerBrandMaterialReferenceCodeId={customerBrandMaterialId}
                                modalOpen={showDetails}
                                setModalOpen={handleReferenceCodeDetailOnClick}
                            />
                        }
                    </>
                }
            </Typography>

        </>
    )

};

export default ShowMaterialReferenceCode;