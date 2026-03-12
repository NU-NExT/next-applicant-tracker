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