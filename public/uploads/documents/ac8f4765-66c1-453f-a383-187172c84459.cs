using Abp.Application.Services.Dto;
using Abp.Domain.Repositories;
using Abp.UI;
using DevExtreme.AspNet.Data.ResponseModel;
using DevExtreme.AspNet.Data;
using ERP.Authorization.Users;
using ERP.Business.LeaveApplication.Dto;
using ERP.Category.HomeContent.Dto;
using ERP.Departments.Dto;
using ERP.Models.Business;
using ERP.Units.Dto;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web.Http.Results;
using ERP.Shared;
using ERP.Configuration;
using ERP.Business.RabbitMQ;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using ERP.Models.Category;

namespace ERP.Business.LeaveApplication
{
    public class EmployeeInfoAppService : ERPAppServiceBase, IEmployeeInfoAppService
    {
        private readonly IRepository<Models.Business.EmployeeInfo, long> _employeeInfoRepository;
        private readonly IRepository<Models.Category.EmailTemplate, long> _tempMailRepository;
        private readonly IRepository<Models.Category.SendEmail, long> _sendMailRepository;
        private readonly IRepository<Models.Category.ListOfValue, long> _listOfValueRepository;
        private readonly IRepository<User, long> _userRepository;
        private readonly IHostingEnvironment _env;
        private readonly IConfigurationRoot _appConfiguration;

        public EmployeeInfoAppService(IRepository<EmployeeInfo, long> employeeInfoRepository,
            IRepository<Models.Category.EmailTemplate, long> tempMailRepository,
            IRepository<Models.Category.SendEmail, long> sendMailRepository,
            IRepository<Models.Category.ListOfValue, long> listOfValueRepository,
            IRepository<User, long> userRepository,
            IHostingEnvironment env
        )
        {
            _employeeInfoRepository = employeeInfoRepository;
            _tempMailRepository = tempMailRepository;
            _sendMailRepository = sendMailRepository;
            _listOfValueRepository = listOfValueRepository;
            _userRepository = userRepository;
            _env = env;
            _appConfiguration = env.GetAppConfiguration();
        }

        public async Task<EmployeeInfoDto> GetBySubscriberEmail(string subscriberEmail)
        {
            try
            {
                var employeeInfo = await _employeeInfoRepository.GetAll().Where(x => x.Email.Equals(subscriberEmail))
                    .Select(c => new EmployeeInfo
                    {
                        Id = c.Id,
                        EmployeeId = c.EmployeeId,
                        EmployeeCode = c.EmployeeCode,
                        FullName = c.FullName,
                        Email = c.Email,
                        DepartmentName = c.DepartmentName,
                        DepartmnetId = c.DepartmnetId,
                        FunctionId = c.FunctionId,
                        FunctionName = c.FunctionName,
                        PhoneNumber = c.PhoneNumber,
                        Position = c.Position,
                        Sex = c.Sex,
                        ViTriCongViec = c.ViTriCongViec,
                        NgaySinh = c.NgaySinh,
                        DateClose = c.DateClose,
                        DateSelectGift = c.DateSelectGift
                    }).FirstOrDefaultAsync();

                if (employeeInfo != null || (subscriberEmail == "vanthu@aits.vn" 
                    || subscriberEmail == "vanthu1@aits.vn" 
                    || subscriberEmail == "vanthu2@aits.vn"
                    || subscriberEmail == "admin@defaulttenant.com"))
                {
                    return ObjectMapper.Map<EmployeeInfoDto>(employeeInfo);
                }
                else
                {
                    throw new UserFriendlyException(L("Không có thông tin nhân viên"),subscriberEmail);
                }
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);
            }
        }

        public async Task<EmployeeInfoDto> GetById(long id)
        {
            var lstEmployeeInfo = await _employeeInfoRepository.GetAll().Where(x => x.Id == id).ToListAsync();

            var query = lstEmployeeInfo.Select(c => new EmployeeInfoDto
            {
                Id = c.Id,
                EmployeeId = c.EmployeeId,
                EmployeeCode = c.EmployeeCode,
                FullName = c.FullName,
                Email = c.Email,
                DepartmentName = c.DepartmentName,
                DepartmnetId = c.DepartmnetId,
                FunctionId = c.FunctionId,
                FunctionName = c.FunctionName,
                PhoneNumber = c.PhoneNumber,
                Position = c.Position,
                Sex = c.Sex,
                ViTriCongviec = c.ViTriCongViec
            }).ToList();

            return ObjectMapper.Map<EmployeeInfoDto>(query);
        }

        public async Task<EmployeeInfoDto> GetBySubscriberKPIEmail(string subscriberKPIEmail)
        {
            try
            {
                var employeeInfo = await _employeeInfoRepository.GetAll().Where(x => x.Email.Equals(subscriberKPIEmail))
                    .Select(c => new EmployeeInfo
                    {
                        Id = c.Id,
                        EmployeeId = c.EmployeeId,
                        EmployeeCode = c.EmployeeCode,
                        FullName = c.FullName,
                        Email = c.Email,
                        DepartmentName = c.DepartmentName,
                        DepartmnetId = c.DepartmnetId,
                        FunctionId = c.FunctionId,
                        FunctionName = c.FunctionName,
                        PhoneNumber = c.PhoneNumber,
                        Position = c.Position,
                        Sex = c.Sex,
                        ViTriCongViec = c.ViTriCongViec
                    }).FirstOrDefaultAsync();

                if (employeeInfo != null)
                {
                    return ObjectMapper.Map<EmployeeInfoDto>(employeeInfo);
                }
                else
                {
                    throw new UserFriendlyException(L("Không có thông tin nhân viên lập kế hoạch giờ công"), subscriberKPIEmail);
                }
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);
            }
        }
            
        public async Task GetUpdateDateClose( string subscriberEmail)
        {
            var dateclose = await _employeeInfoRepository.FirstOrDefaultAsync(x=>x.Email == subscriberEmail);
            dateclose.DateClose = DateTime.Now;
            ObjectMapper.Map(dateclose, dateclose);
        }

        public async Task GetSendMailGift(string gift)
        {
            var curUserId = AbpSession.UserId;
            var mailCurrent = await _userRepository.FirstOrDefaultAsync((long)curUserId);
            var infoUser = await _employeeInfoRepository.FirstOrDefaultAsync(x=> x.Email == mailCurrent.EmailAddress);
            if(infoUser.DateSelectGift != null && infoUser.DateSelectGift.Value.Day == DateTime.Now.Day && infoUser.DateSelectGift.Value.Month == DateTime.Now.Month && infoUser.DateSelectGift.Value.Year == DateTime.Now.Year)
            {
                throw new UserFriendlyException("Bạn đã chọn quà rồi!");
            }    
            var name = infoUser.FullName;
            var giftname = await _listOfValueRepository.FirstOrDefaultAsync(x => x.ValueField == gift);
            var temp = await _tempMailRepository.FirstOrDefaultAsync(x => x.TemplateName == "SendMailGift");
            var strTemp = temp.TemplateContent;
            strTemp = strTemp.Replace("{QUA}", giftname.TextField);
            strTemp = strTemp.Replace("{TEN}", name);

            var listMail = await _listOfValueRepository.GetAll().Where(x => x.ListName == "HPBD_MAIL").ToArrayAsync();

            //foreach(var i in listMail)
            //{
            //    await _sendMailRepository.InsertAsync(new Models.Category.SendEmail
            //    {
            //        Email = i.TextField,
            //        Content = strTemp,
            //        Subject = temp.MailSubject,
            //        IsSuccess = false,
            //        IsActive = true,
            //        IsDeleted = false,
            //        CreationTime = DateTime.Now,
            //        TenantId = this.AbpSession.TenantId,
            //    });
            //}

            IRabbitMQProducer rabbitMQProducer = new RabbitMQProducer(_env);
            foreach (var i in listMail)
            {
                var sendEmail = new SendEmail
                {
                    Email = i.TextField,
                    Content = strTemp,
                    Subject = temp.MailSubject,
                    IsSuccess = false,
                    IsActive = true,
                    IsDeleted = false,
                    CreationTime = DateTime.Now,
                    TenantId = this.AbpSession.TenantId,
                };
                rabbitMQProducer.SendMessage(sendEmail);
                Logger.Error("[GetSendMailGift] Push SendEmail to RabbitMQ email=" + sendEmail.Email);
            }

            infoUser.DateSelectGift = DateTime.Now;
            ObjectMapper.Map(infoUser, infoUser);
            await CurrentUnitOfWork.SaveChangesAsync();
            //string message = "Thông tin quà tặng đã được ghi nhận, phòng TCHC sẽ gửi quà đến bạn trong thời gian sớm nhất!";
            //return message;
        }

        //public async Task<PagedResultDto<EmployeeInfoDto>> GetListBirthDay()
        //{
        //    try
        //    {
        //        var employeeInfo = await _employeeInfoRepository.GetAll()
        //            .Where(x =>
        //                x.NgaySinh != null
        //                && x.NgaySinh.Value.Day == DateTime.Now.Day
        //                && x.NgaySinh.Value.Month == DateTime.Now.Month
        //                )
        //            .Select(c => new EmployeeInfo
        //            {
        //                Id = c.Id,
        //                EmployeeId = c.EmployeeId,
        //                EmployeeCode = c.EmployeeCode,
        //                FullName = c.FullName,
        //                Email = c.Email,
        //                DepartmentName = c.DepartmentName,
        //                DepartmnetId = c.DepartmnetId,
        //                FunctionId = c.FunctionId,
        //                FunctionName = c.FunctionName,
        //                PhoneNumber = c.PhoneNumber,
        //                Position = c.Position,
        //                Sex = c.Sex,
        //                ViTriCongViec = c.ViTriCongViec,
        //                NgaySinh = c.NgaySinh,
        //            }).ToListAsync();
        //        return new PagedResultDto<EmployeeInfoDto>(employeeInfo.Count(), ObjectMapper.Map<List<EmployeeInfoDto>>(employeeInfo));
        //    }
        //    catch (Exception ex)
        //    {
        //        throw ex;
        //    }
            
        //}


        public async Task<LoadResult> GetListBirthDay(DataSourceLoadOptions loadOptions)
        {
            var query = _employeeInfoRepository.GetAll().Where(x =>
                        x.NgaySinh != null
                        && x.NgaySinh.Value.Day == DateTime.Now.Day
                        && x.NgaySinh.Value.Month == DateTime.Now.Month
                        && x.Machucdanh != null
                        )
                .Select(c => new EmployeeInfo
                {
                    Id = c.Id,
                    EmployeeId = c.EmployeeId,
                    EmployeeCode = c.EmployeeCode,
                    FullName = c.FullName,
                    Email = c.Email,
                    DepartmentName = c.DepartmentName,
                    DepartmnetId = c.DepartmnetId,
                    FunctionId = c.FunctionId,
                    FunctionName = c.FunctionName,
                    PhoneNumber = c.PhoneNumber,
                    Position = c.Position,
                    Sex = c.Sex,
                    ViTriCongViec = c.ViTriCongViec,
                    NgaySinh = c.NgaySinh,
                });

            return await DataSourceLoader.LoadAsync(query, loadOptions);
        }

        public async Task GetSendMailBirthDay(string wish, int id)
        {
            var curUserId = AbpSession.UserId;
            var mailCurrent = await _userRepository.FirstOrDefaultAsync((long)curUserId);
            var infoUser = await _employeeInfoRepository.FirstOrDefaultAsync(x => x.Email == mailCurrent.EmailAddress);
            string name = "";
            if (infoUser==null)
            {
                name = "Admin";
            }
            else
            {
                name = infoUser.FullName;
            }

            var infoBirthDay = await _employeeInfoRepository.FirstOrDefaultAsync(x => x.Id == id);
            var mailBirthDay = infoBirthDay.Email;
            var temp = await _tempMailRepository.FirstOrDefaultAsync(x => x.TemplateName == "SendMailBirthDay");
            var strTemp = temp.TemplateContent;
            strTemp = strTemp.Replace("{NguoiGui}", name);
            strTemp = strTemp.Replace("{LoiChuc}", wish);

            //await _sendMailRepository.InsertAsync(new Models.Category.SendEmail
            //{
            //    Email = mailBirthDay,
            //    Content = strTemp,
            //    Subject = temp.MailSubject,
            //    IsSuccess = false,
            //    IsActive = true,
            //    IsDeleted = false,
            //    CreationTime = DateTime.Now,
            //    TenantId = this.AbpSession.TenantId,
            //});
            //await CurrentUnitOfWork.SaveChangesAsync();

            IRabbitMQProducer rabbitMQProducer = new RabbitMQProducer(_env);
            var sendEmail = new SendEmail
            {
                Email = mailBirthDay,
                Content = strTemp,
                Subject = temp.MailSubject,
                IsSuccess = false,
                IsActive = true,
                IsDeleted = false,
                CreationTime = DateTime.Now,
                TenantId = this.AbpSession.TenantId,
            };
            rabbitMQProducer.SendMessage(sendEmail);
            Logger.Error("[GetSendMailBirthDay] Push SendEmail to RabbitMQ email=" + sendEmail.Email);
        }

    }

    }

