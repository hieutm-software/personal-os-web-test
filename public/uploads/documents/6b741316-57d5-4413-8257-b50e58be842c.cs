using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    [AutoMapTo(typeof(Models.Business.EmployeeInfo))]   
    public class EmployeeInfoDto : EntityDto<long>
    {
        public long? EmployeeId { get; set; }
        public long? EmployeeCode { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public bool? Sex { get; set; }
        public long? DepartmnetId { get; set; }
        public string DepartmentName { get; set; }
        public int? FunctionId { get; set; }
        public string FunctionName { get; set; }
        public string Position { get; set; }

        public string ViTriCongviec { get; set; }
        public string MaDonVi { get; set; }

        public DateTime? CreationTime { get; set; }
        public DateTime? LastModificationTime { get; set; }
        public DateTime? NgaySinh { get; set; }
        public DateTime? DateClose { get; set; }
        public DateTime? DateSelectGift { get; set; }
        
    }
}
