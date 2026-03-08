output "alb_dns_name" {
  value = aws_lb.app.dns_name
}

output "api_gateway_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}