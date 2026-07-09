
import VirtualWarehouse from "@/views/virtual_warehouse/VirtualWarehouse"
import { useRouter } from "next/router";

const index = () => {
    const router = useRouter();
    const {inhouse_material_id} = router.query;

    return (
        
    <VirtualWarehouse inhouse_material_id={inhouse_material_id}/>
    
    )
  }
  
  export default index