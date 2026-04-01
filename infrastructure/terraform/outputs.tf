output "alb_dns_name" {
  value = aws_lb.app.dns_name
}

output "api_gateway_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_app_client_id" {
  value = aws_cognito_user_pool_client.app_client.id
}

output "cognito_hosted_ui_domain" {
  value = "${aws_cognito_user_pool_domain.hosted_ui.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_hosted_ui_login_url" {
  value = "https://${aws_cognito_user_pool_domain.hosted_ui.domain}.auth.${var.aws_region}.amazoncognito.com/login?client_id=${aws_cognito_user_pool_client.app_client.id}&response_type=code&scope=openid+email+profile&redirect_uri=${urlencode(var.cognito_callback_urls[0])}"
}

output "frontend_cognito_env" {
  value = {
    VITE_COGNITO_DOMAIN       = "${aws_cognito_user_pool_domain.hosted_ui.domain}.auth.${var.aws_region}.amazoncognito.com"
    VITE_COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.app_client.id
    VITE_COGNITO_REDIRECT_URI = var.cognito_callback_urls[0]
  }
}

output "s3_bucket_resumes" {
  value = aws_s3_bucket.resumes.bucket
}

output "s3_bucket_transcripts" {
  value = aws_s3_bucket.transcripts.bucket
}

output "s3_bucket_files" {
  value = aws_s3_bucket.files.bucket
}

output "route53_zone_id" {
  value = var.enable_route53 ? local.route53_zone_id : null
}

output "route53_frontend_fqdn" {
  value = var.enable_route53 ? local.route53_frontend_record_name : null
}

output "route53_api_fqdn" {
  value = var.enable_route53 ? local.route53_api_record_name : null
}