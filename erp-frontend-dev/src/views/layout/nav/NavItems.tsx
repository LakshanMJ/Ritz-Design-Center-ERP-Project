import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import FormatSizeOutlinedIcon from '@mui/icons-material/FormatSizeOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import PivotTableChartIcon from '@mui/icons-material/PivotTableChart';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import LineWeightIcon from '@mui/icons-material/LineWeight';
// import BlurOnIcon from '@mui/icons-material/BlurOn';
import ListIcon from '@mui/icons-material/List';
import HomeIcon from '@mui/icons-material/Home';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
// import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccessAlarmIcon from '@mui/icons-material/AccessAlarm';
import LowPriorityIcon from '@mui/icons-material/LowPriority';
import PermDataSettingIcon from '@mui/icons-material/PermDataSetting';
import { useRouter } from 'next/router';
import * as ROLES from '../../../helpers/constants/RoleManager';
// import ProductionQuantityLimitsIcon from '@mui/icons-material/ProductionQuantityLimits';
import ChecklistIcon from '@mui/icons-material/Checklist';
import BackupTableIcon from '@mui/icons-material/BackupTable';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import IronIcon from '@mui/icons-material/Iron';
import FaxIcon from '@mui/icons-material/Fax';
import EditNoteIcon from '@mui/icons-material/EditNote';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import TaskIcon from '@mui/icons-material/Task';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FactoryIcon from '@mui/icons-material/Factory';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

const iconStyle = {
    fontSize: '1rem',
    height: 16,
    width: 16,
}

const NavItems = () => {
    const router = useRouter();

    const items = [
       // {
    //     name: 'Home',
    //     isGroupLabel: false,
    //     url: '/',
    //     icon: <HomeIcon sx={iconStyle} />,
    //     selected: router.pathname === '/',
    //     allow_roles:[ROLES.ADMIN, ROLES.MERCHANT]
    // }, 
    {
        name: 'Order Inquiries',
        isGroupLabel: true,
        icon: <PlaylistAddCheckIcon sx={iconStyle} />,
        allow_roles:[ROLES.ADMIN, ROLES.MERCHANT, ROLES.CAD_USER_ROLE, ROLES.IE_USER],
        children: [{
            name: 'Order Inquiries',
            url: '/costing',
            icon: <BackupTableIcon sx={iconStyle} />,
            selected: router.pathname.includes('/costing') && !router.pathname.includes('/costings') && !router.pathname.includes('/costing-inquiries') && !router.pathname.includes('/costing/cad') && !router.pathname.includes('/costing/program') && !router.pathname.includes('/costing/consolidate_supplier_inquiries/new_supplier_inquiries') && !router.pathname.includes('/costing/consolidate_supplier_inquiries/sent_supplier_inquiries'),
        },
        // {
        //     name: 'Order Process',
        //     url: '/order_process',
        //     icon: <PublicOutlinedIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/order_process'),
        // }, {
        //     name: 'Costings',
        //     url: '/costings',
        //     icon: <PublicOutlinedIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/costings'),
        // }
    ]
    },
    // {
    //     name: 'Order Programs',
    //     url: '/costing/program',
    //     icon: <ListIcon sx={iconStyle} />,
    //     selected: router.pathname.includes('/costing/program'),
    //     allow_roles:[ROLES.ADMIN, ROLES.MERCHANT, ROLES.CAD_USER_ROLE, ROLES.IE_USER]
    // },
    {
        name: 'Material Inquiries',
        isGroupLabel: true,
        icon: <SupportAgentIcon sx={iconStyle} />,
        allow_roles:[ROLES.ADMIN, ROLES.MERCHANT, ROLES.CAD_USER_ROLE],
        children: [{
            name: 'Create Supplier Inquiries',
            url: '/costing/consolidate_supplier_inquiries/new_supplier_inquiries',
            icon: <BackupTableIcon sx={iconStyle} />,
            selected: router.pathname.includes('/costing/consolidate_supplier_inquiries/new_supplier_inquiries'),
        }, {
            name: 'Supplier Inquiries',
            url: '/costing/consolidate_supplier_inquiries/sent_supplier_inquiries',
            icon: <PublicOutlinedIcon sx={iconStyle} />,
            selected: router.pathname.includes('/costing/consolidate_supplier_inquiries/sent_supplier_inquiries'),
        }
    ]
    },
    // {
    //     name: 'Purchase Order',
    //     isGroupLabel: true,
    //     icon: <BackupTableIcon sx={iconStyle} />,
    //     allow_roles:[ROLES.ADMIN, ROLES.MERCHANT, ROLES.CAD_ADMIN, ROLES.CAD_USER_ROLE],
    //     children: [
    //     {
    //         name: 'Purchase Orders',
    //         url: '/purchase_order',
    //         icon: <BackupTableIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/purchase_order')  && !router.pathname.includes('/purchase_order/po_upload') && !router.pathname.includes('/purchase_order/purchase_order_club') 
    //         && !router.pathname.includes('/purchase_order/material_transfer') && !router.pathname.includes('/purchase_order/material_transfer_list') && !router.pathname.includes('/purchase_order/supplier_po_list')
    //         && !router.pathname.includes('/purchase_order/service_po_list')
    //     },
    //      {
    //         name: 'Purchase Order Clubs',
    //         url: '/purchase_order/purchase_order_club',
    //         icon: <PublicOutlinedIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/purchase_order/purchase_order_club'),
    //     },
    //     {
    //         name: 'Material Transfer',
    //         url: '/purchase_order/material_transfer',
    //         icon: <PublicOutlinedIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/purchase_order/material_transfer') && !router.pathname.includes('/purchase_order/material_transfer_list'),
    //     },
    //     {
    //         name: 'Material Transfer List',
    //         url: '/purchase_order/material_transfer_list',
    //         icon: <PublicOutlinedIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/purchase_order/material_transfer_list'),
    //     },
    //     {
    //         name: 'Supplier POs',
    //         url: '/purchase_order/supplier_po_list',
    //         icon: <PublicOutlinedIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/purchase_order/supplier_po_list'),
    //     },
    //     {
    //         name: 'Service POs',
    //         url: '/purchase_order/service_po_list',
    //         icon: <PublicOutlinedIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/purchase_order/service_po_list'),
    //     }
    // ]
    // },
    // {
    //     name: 'General Purchase Order',
    //     isGroupLabel: true,
    //     icon: <EditNoteIcon sx={iconStyle} />,
    //     allow_roles:[ROLES.ADMIN, ROLES.MERCHANT ],
    //     children: [{
    //         name: 'General Purchase Orders',
    //         url: '/general_purchase_order',
    //         icon: <BackupTableIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/general_purchase_order')
    //     }
    // ]
    // },
    // {
    //     name: 'Warehouse Actions',
    //     isGroupLabel: true,
    //     icon: <LocalGroceryStoreIcon sx={iconStyle} />,
    //     allow_roles: [ROLES.ADMIN, ROLES.FABRIC_INSPECTOR, ROLES.GRN_CLERK, ROLES.GRN_ADMIN, ROLES.GRN_MANAGER],
    //     children: [{
    //         name: 'GRN',
    //         url: '/goods_received_note',
    //         icon: <ChecklistIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/goods_received_note') && !router.pathname.includes('/goods_received_note/grn_transfer')
    //     }, 
    //     {
    //         name: 'Material Verification',
    //         url: '/material_verification',
    //         icon: <PublicOutlinedIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/material_verification')
    //     }
        
    // ]
    // },
    // {
    //     name: 'CAD Inquiries',
    //     isGroupLabel: true,
    //     icon: <DashboardIcon sx={iconStyle} />,
    //     allow_roles: [ROLES.ADMIN, ROLES.CAD_USER_ROLE],
    //     children: [{
    //         name: 'CAD Inquiries',
    //         url: '/costing/cad',
    //         icon: <ChecklistIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/costing/cad') && !router.pathname.includes('/costing/cad/speed_consumption')
    //     }, {
    //         name: 'Speed Consumption',
    //         url: '/costing/cad/speed_consumption',
    //         icon: <PublicOutlinedIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/costing/cad/speed_consumption')
    //     }
    // ]
    // },
    // {
    //     name: 'Virtual Warehouse',
    //     isGroupLabel: false,
    //     url: '/virtual_warehouse',
    //     icon: <WarehouseIcon sx={iconStyle} />,
    //     selected: router.pathname.includes('/virtual_warehouse'),
    //     allow_roles: [ROLES.ADMIN, ROLES.CAD_USER_ROLE],
    // },
    {
        name: 'Admin',
        isGroupLabel: true,
        icon: <SettingsIcon sx={iconStyle} />,
        allow_roles: [ROLES.ADMIN],
        children: [
        // {
        //     name: 'Items',
        //     url: '/admin/item',
        //     icon: <ListIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/admin/item')
        // }
        {
            name: 'Countries',
            url: '/admin/country',
            icon: <PublicOutlinedIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/country')
        }, {
            name: 'Sizes',
            url: '/admin/size',
            icon: <FormatSizeOutlinedIcon sx={iconStyle} />,
            selected: router.pathname === '/admin/size'
        },{
            name: 'Brands',
            url: '/admin/brand',
            icon: <CheckroomIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/brand')
        },{
            name: 'Customers',
            url: '/admin/customer',
            icon: <PeopleIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/customer')
        }
        // {
        //     name: 'Suppliers',
        //     url: '/admin/supplier',
        //     icon: <LowPriorityIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/admin/supplier')
        // }
        , {
            name: 'Seasons',
            url: '/admin/season',
            icon: <LocalFloristIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/season')
        },{
            name: 'Size Categories',
            url: '/admin/size_category',
            icon: <LineWeightIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/size_category')
        },
        // {
        //     name: 'Embellishment',
        //     url: '/admin/embellishment',
        //     icon: <LineWeightIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/admin/embellishment')
        // },
        // {
        //     name: 'Other Cost Types',
        //     url: '/admin/other_cost_types',
        //     icon: <LineWeightIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/admin/other_cost_types')
        // },
        {
            name: 'Departments',
            url: '/admin/departments',
            icon: <LocalFloristIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/departments')
        },
        {
            name: 'WareHouse',
            url: '/admin/warehouse',
            icon: <LocalFloristIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/warehouse')
        },
        {
            name: 'Plants',
            url: '/admin/plants',
            icon: <CheckroomIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/plants')
        },
        {
            name: 'Ports',
            url: '/admin/ports',
            icon: <CheckroomIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/ports')
        }
        // {
        //     name: 'Placements',
        //     url: '/admin/placement',
        //     icon: <PivotTableChartIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/admin/placement')
        // }
    ]
    },

    // {
    //     name: 'IE Interface',
    //     isGroupLabel: true,
    //     icon: <AccessAlarmIcon sx={iconStyle} />,
    //     allow_roles: [ROLES.ADMIN, ROLES.IE_USER],
    //     children: [{
    //         name: 'Item Operation',
    //         url: '/ie_interface/item_operation/',
    //         icon: <IronIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/ie_interface/item_operation')
    //     },
    //     {
    //         name: 'Machine',
    //         url: '/ie_interface/machine',
    //         icon: <PrecisionManufacturingIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/ie_interface/machine')
    //     },
    //     {
    //         name: 'Folder',
    //         url: '/ie_interface/folder',
    //         icon: <FolderOpenIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/ie_interface/folder')
    //     },
    //     {
    //         name: 'Operation Inquiries',
    //         url: '/ie_interface/operation_inquiries',
    //         icon: <FaxIcon sx={iconStyle} />,
    //         selected: router.pathname.includes('/ie_interface/operation_inquiries')
    //     }]
    // },
    {

        name: 'Transport',
        isGroupLabel: true,
        icon: <LocalShippingIcon sx={iconStyle} />,
        allow_roles: [ROLES.ADMIN, ROLES.TRANSPORT_ADMIN , ROLES.TRANSPORT_USER],
        children: [
        // { 
        //     name: 'Vessel Cut Off Dates',
        //     url: '/transport/vessel_cut_off_dates',
        //     icon: <CheckroomIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/transport/vessel_cut_off_dates')
        // },
        {
            name: 'Import Delivery Track',
            url: '/transport/import_delivery_track',
            icon: <CheckroomIcon sx={iconStyle} />,
            selected: router.pathname.includes('/transport/import_delivery_track')
        },
        { 
            name: 'Local Transport',
            url: '/transport/local_transport',
            icon: <CheckroomIcon sx={iconStyle} />,
            selected: router.pathname.includes('/transport/local_transport')
        }
        ]
    },
    {
        name: 'Transport Admin',
        isGroupLabel: true,
        icon: <SettingsIcon sx={iconStyle} />,
        allow_roles: [ROLES.ADMIN, ROLES.TRANSPORT_ADMIN , ROLES.TRANSPORT_USER],
        children: [
        // {
        //     name: 'Freight Forwarder Management',
        //     url: '/transport/freight_forwarder',
        //     icon: <CheckroomIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/transport/freight_forwarder')
        // },
        // {
        //     name: 'Ex-Work Charges',
        //     url: '/transport/ex_work_charges',
        //     icon: <CheckroomIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/transport/ex_work_charges')
        // },
        {
            name: 'Vehicle Types',
            url: '/transport/vehicle_types',
            icon: <CheckroomIcon sx={iconStyle} />,
            selected: router.pathname.includes('/transport/vehicle_types')
        },
        {
            name: 'Transport Type',
            url: '/transport/transport_types',
            icon: <CheckroomIcon sx={iconStyle} />,
            selected: router.pathname.includes('/transport/transport_types')
        },
        // {
        //     name: 'Transport Per Unit Charges',
        //     url: '/transport/transport_per_unit_charges',
        //     icon: <CheckroomIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/transport/transport_per_unit_charges')
        // },
        // {
        //     name: 'Transport Fixed Charges',
        //     url: '/transport/transport_fixed_charges',
        //     icon: <CheckroomIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/transport/transport_fixed_charges')
        // }
        ]
    },
    {
        name: 'Materials',
        isGroupLabel: true,
        icon: <CategoryIcon sx={iconStyle} />,
        allow_roles: [ROLES.ADMIN, ROLES.MERCHANT_ADMIN],
        children: [{
            name: 'Materials',
            url: '/admin/material_types/materials',
            icon: <DashboardCustomizeIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/material_types/materials'),
            allow_roles: [ROLES.ADMIN,]
        },
        // {
        //     name: 'Created Materials',
        //     url: '/admin/material_types/created_materials',
        //     icon: <DashboardCustomizeIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/admin/material_types/created_materials'),
        //     allow_roles: [ROLES.MERCHANT,]
        // }, 
        // {
        //     name: 'Customer Materials',
        //     url: '/admin/material_types/customer_materials',
        //     icon: <DashboardCustomizeIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/admin/material_types/customer_materials'),
        //     allow_roles: [ROLES.MERCHANT,]
        // },
        // {
        //     name: 'Material Options',
        //     url: '/admin/material_types/material_options',
        //     icon: <PermDataSettingIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/admin/material_types') && !router.pathname.includes('/admin/material_types/materials') && !router.pathname.includes('/admin/material_types/created_materials' ) && !router.pathname.includes('/admin/material_types/customer_materials'),
        //     //for the above router path, added a new condition to the created materials page
        //     allow_roles: [ROLES.ADMIN, ROLES.MERCHANT_ADMIN]
        // }
    ]
    }, {
        name: 'Users',
        isGroupLabel: true,
        icon: <ManageAccountsIcon sx={iconStyle} />,
        allow_roles: [ROLES.ADMIN],
        children: [{
            name: 'Users',
            url: '/admin/user',
            icon: <PersonIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/user') && !router.pathname.includes('user_role') && !router.pathname.includes('user_group')
        },
        {
            name: 'User Roles',
            url: '/admin/user_role',
            icon: <RecordVoiceOverIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/user_role')
        },
        {
            name: 'User Groups',
            url: '/admin/user_group',
            icon: <GroupsIcon sx={iconStyle} />,
            selected: router.pathname.includes('/admin/user_group')
        }]
    },{
        name: 'Tasks',
        isGroupLabel: true,
        icon: <TaskIcon sx={iconStyle} />,
        allow_roles: [ROLES.ADMIN, ROLES.MERCHANT_ADMIN, ROLES.MERCHANT],
        children: [{
            name: 'My Approvals',
            url: '/tasks/my_approvals',
            icon: <PersonIcon sx={iconStyle} />,
            selected: router.pathname.includes('/tasks/my_approvals')
        },
        {
            name: 'All Approvals',
            url: '/tasks/all_approvals',
            icon: <PersonIcon sx={iconStyle} />,
            selected: router.pathname.includes('/tasks/all_approvals')
        },
        {
            name: 'My Tasks',
            url: '/tasks/my_tasks',
            icon: <PersonIcon sx={iconStyle} />,
            selected: router.pathname.includes('/tasks/my_tasks')
        },
        {
            name: 'All Tasks',
            url: '/tasks/all_tasks',
            icon: <PersonIcon sx={iconStyle} />,
            selected: router.pathname.includes('/tasks/all_tasks')
        }
        ]},
    {
        name: 'Finance',
        isGroupLabel: true,
        icon: <AccountBalanceIcon sx={iconStyle} />,
        allow_roles: [ROLES.ADMIN, ROLES.FINANCE_ADMIN, ROLES.FINANCE_USER],
        children: [
        // {
        //     name: 'PCL Summary',
        //     url: '/pcl/finance',
        //     icon: <AttachMoneyIcon sx={iconStyle} />,
        //     selected: router.pathname === '/pcl/finance' && !router.pathname.includes('/pcl/finance/incoming_payments') && !router.pathname.includes('/pcl/finance/outgoing_payments'),
        // },
        // {
        //     name: 'PCL Facility Dashboard',
        //     url: '/pcl/finance/pcl_facility',
        //     icon: <AttachMoneyIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/pcl/finance/pcl_facility')
        // },
        {
            name: 'PCL Settlement',
            url: '/pcl/finance/pcl_settlement',
            icon: <AttachMoneyIcon sx={iconStyle} />,
            selected: router.pathname.includes('/pcl/finance/pcl_settlement')
        },
        {
            name: 'PCL Due Calendar',
            url: '/pcl/finance/pcl_due_calendar',
            icon: <AttachMoneyIcon sx={iconStyle} />,
            selected: router.pathname.includes('/pcl/finance/pcl_due_calendar')
        },
        // {
        //     name: 'PCL Facilities',
        //     url: '/pcl/finance/pcl_list',
        //     icon: <AttachMoneyIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/pcl/finance/pcl_list')
        // },
        {
            name: 'Pending PCL PO Clubs',
            url: '/pcl/finance/pending_pcl_po_clubs',
            icon: <AttachMoneyIcon sx={iconStyle} />,
            selected: router.pathname.includes('/pcl/finance/pending_pcl_po_clubs')
        },
        // {
        //     name: 'Incoming Payments',
        //     url: '/pcl/finance/incoming_payments',
        //     icon: <AttachMoneyIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/pcl/finance/incoming_payments')
        // },
        // {
        //     name: 'Outgoing Payments',
        //     url: '/pcl/finance/outgoing_payments',
        //     icon: <AttachMoneyIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/pcl/finance/outgoing_payments')
        // },
        // {
        //     name: 'Commercial Invoices',
        //     url: '/pcl/finance/commercial_invoice',
        //     icon: <ListIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/pcl/finance/commercial_invoice'),
        //     allow_roles:[ROLES.ADMIN, ROLES.MERCHANT]
        // },
        // {
        //     name: 'Outgoing Commercial Invoices',
        //     url: '/pcl/finance/outgoing_commercial_invoices',
        //     icon: <AttachMoneyIcon sx={iconStyle} />,
        //     selected: router.pathname.includes('/pcl/finance/outgoing_commercial_invoices')
        // },
        {
            name: 'Supplier Claim Dashboard',
            url: '/pcl/finance/supplier_claim',
            icon: <AttachMoneyIcon sx={iconStyle} />,
            selected: router.pathname.includes('/pcl/finance/supplier_claim')
        }
        ]},
        {
            name: 'Finance WareHouse',
            isGroupLabel: true,
            icon: <FactoryIcon sx={iconStyle} />,
            allow_roles: [ROLES.ADMIN, ROLES.MERCHANT_ADMIN, ROLES.MERCHANT],
            children: [{
                name: 'Material Summary',
                url: '/finance_warehouse/material_summary',
                icon: <AttachMoneyIcon sx={iconStyle} />,
                selected: router.pathname.includes('/finance_warehouse/material_summary')
            },
            // {
            //     name: 'Costing Wise Material Summary',
            //     url: '/finance_warehouse/costing_wise_material_summary',
            //     icon: <AttachMoneyIcon sx={iconStyle} />,
            //     selected: router.pathname.includes('/finance_warehouse/costing_wise_material_summary')
            // },
            // {
            //     name: 'PO Wise Material Summary',
            //     url: '/finance_warehouse/po_wise_material_summary',
            //     icon: <AttachMoneyIcon sx={iconStyle} />,
            //     selected: router.pathname.includes('/finance_warehouse/po_wise_material_summary')
            // },
            // {
            //     name: 'Fabric Summary',
            //     url: '/finance_warehouse/fabric_summary',
            //     icon: <AttachMoneyIcon sx={iconStyle} />,
            //     selected: router.pathname.includes('/finance_warehouse/fabric_summary')
            // },
        ]}
    ];

    return items;
}

export default NavItems;