let host = "http://api1.acreplatforms.net"
let cssLoaded = false

if (typeof jQuery === "undefined") {
    document.write("<script\n" +
        "  src=\"https://code.jquery.com/jquery-3.6.0.min.js\"\n" +
        "  integrity=\"sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=\"\n" +
        "  crossorigin=\"anonymous\"></script>")
}

let stage = 0

const params = {
    propertyValue: 0,
    mortgageAmount: 0,
    termMonths: 0,
    type: "residential",
    purpose: "remortgage"
}

const back = () => {
    if (stage > 0) stage--
    display(jQuery)
}

const forward = () => {
    persist(jQuery, stage)
    if (stage < 7) stage++
    display(jQuery)
}

const display = ($) => {
    const acreWidget = $(".acre-widget")
    if (acreWidget) {
        const altHost = acreWidget.attr("host")
        if (altHost !== undefined && altHost !== "") {
            host = altHost
            console.log("Host override to "+host)
        }
        if (!cssLoaded) {
            const head = $("head")
            head.append(`<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto">`)
            head.append(`<link rel="stylesheet" href="${host}/v1/acre/local-sourcing/widget/widget.css\"/>`)
            cssLoaded = true
        }
        acreWidget.html(`${stage !== 6 ? header: ''}${parse(stages[stage])}${footer(stage)}`)
        switch (stage) {
            case 0:
                if (params.purpose !== "") {
                    $(`input[type='radio'][value='${params.purpose}']`).prop("checked", true)
                }
                radioChange($, "mType")
                break
            case 1:
                valueChange($)
                break
            case 2:
                amountChange($)
                break
            case 4:
                if (params.type !== "") {
                    $(`input[type='radio'][value='${params.type}']`).prop("checked", true)
                }
                radioChange($, "pType")
                break
            case 5:
                $.post(`${host}/v1/acre/local-sourcing/bestbuys`, params, (data) => {
                    acreWidget.html(`
<h3>Best buys</h3>
${drawTable(data)}
<div class="disclaimer">
    These are indicative best buy products for borrowing &pound;${params.mortgageAmount} over ${params.termMonths}
    months, secured against a property valued at &pound;${params.propertyValue}.
    Exact offers will depend on property type, location and your personal circumstances and status. E&amp;OE;
</div>

<div class="scrollFooter">
<button onclick="back()" class="back">Back</button>   
<div onclick="window.open('https://acresoftware.com', '_new')">
    <div>Powered by</div> <img class="logo" src="${host}/v1/acre/local-sourcing/widget/acre.png" alt="Acre"/>
</div>
</div>
                    `)
                }, "json").fail(function () {
                    $(".warning").html("Could not load best buy data")
                })
        }
    }
}


const drawTable = (data) => {
    if (data.error) {
        return `<div class="warning">${data.error}</div>`
    }
    return data.map(value => {
        return `
<h5>${value.title}</h5>
<p>${value.name}</p>
<table>
    <thead>
        <tr><th>Initial period</th><th>Rate</th><th>Monthly payment</th><th>&nbsp;</th></tr>
    </thead>
    <tbody>
        <tr>
            <td>${(value.initialPeriod > 0 ? value.initialPeriod + " months" : "Term")}</td>
            <td>${value.initialRate}%</td>
            <td>&pound;${value.monthlyPayment}</td>
            <td>${nextButton(stage)}</td>
        </tr>
    </tbody>
</table>        
`
    }).join("\n")

}

const parse = (text) => {
    let months = params.termMonths > 0 ? params.termMonths : 300
    const mod = months % 12
    const years = (months - mod) / 12
    return text.replaceAll("__propertyValue", params.propertyValue > 0 ? params.propertyValue : 250000)
        .replaceAll("__mortgageAmount", params.mortgageAmount > 0 ? params.mortgageAmount : (params.propertyValue > 0 ? params.propertyValue * 0.75 : 100000))
        .replaceAll("__years", years.toString())
        .replaceAll("__months", mod.toString())
}

const persist = ($, stage) => {
    switch (stage) {
        case 0:
            break;
        case 1:
            params.propertyValue = parseInt($("#value").val()) 
            break;
        case 2:
            params.mortgageAmount = parseInt($("#value").val()) 
            break;
        case 3:
            const months = parseInt($("#months").val())
            const years = parseInt($("#years").val())
            params.termMonths = months + (years * 12)
            break;
        case 6:
            // Acre API use pence for currency amounts so therefore we multiple by 100.
            $.post(`${host}/v1/acre/local-sourcing/lead`, {
                ...params,
                propertyValue: params.propertyValue * 100,
                mortgageAmount: params.mortgageAmount * 100,
                firstname: $("#firstname").val(),
                lastname: $("#lastname").val(),
                email: $("#email").val(),
                phone: $("#phone").val(),
                organisation: $(".acre-widget").attr("organisation"),
                user: $(".acre-widget").attr("user")
            }, () => console.log("Saved"), "json")
    }
}

const header = `<h3>Quick mortgage calculator</h3>
<div>`

const nextButton = (stage) => {
    switch (stage) {
        case 4:
            return `<button onclick="forward()" class="next">Show me</button>`
        case 5:
            return `<button onclick="forward()" class="next">Enquire</button>`
        case 6:
            return `<button onclick="forward()" class="next">Submit my details</button>`
        case 7:
            return ``
        default:
            return `<button onclick="forward()" class="next">Next</button>`
    }
}

const footer = (stage) => `<div class="buttons">
${stage > 0 ? `<button onclick="back()" class="back">Back</button>` : ''}
${nextButton(stage)}
</div>
<div id="footer" onclick="window.open('https://acresoftware.com', '_new')">
<div>Powered by</div> <img class="logo" src="${host}/v1/acre/local-sourcing/widget/acre.png" alt="Acre"/>
</div>
</div>`

const valueChange = ($) => {
    const val = parseInt($("#value").val())
    if (isNaN(val)) {
        $(".warning").html("You must enter a property value")
        $(".next").attr("disabled", true)
    } else {
        $(".warning").html("")
        $(".next").attr("disabled", false)
    }
}

const amountChange = ($) => {
    const val = parseInt($("#value").val())
    if (val > params.propertyValue) {
        $(".warning").html("Loan amount must be less than value of property")
        $(".next").attr("disabled", true)
    } else if (isNaN(val)) {
        $(".warning").html("You must enter a loan amount")
        $(".next").attr("disabled", true)
    } else {
        $(".warning").html("")
        $(".next").attr("disabled", false)
    }
}

const radioChange = ($, name) => {
    $(`input[name='${name}']`).parent().removeClass("checked")
    const selected = $(`input[name='${name}']:checked`)
    if (selected.length === 0) {
        $(".next").attr("disabled", true)
        $(".warning").html("You must select an option")
        return
    }
    $(".next").attr("disabled", false)
    $(".warning").html("")
    selected.parent().addClass("checked")
    switch (name) {
        case "mType":
            params.purpose = selected.val()
            console.log(params)
            break
        case "pType":
            params.type = selected.val()
            break
    }

}

const stages = [
    `<!-- 0 -->
<div class="intro">By answering just five quick questions we'll be able to give you an idea of what offers are available from us right now.</div>
<div class="intro">Are you looking to</div>
<div class="radioGroup stack">
<label for="mTypeRemo" class="radio">
<input type="radio" name="mType" id="mTypeRemo" value="remortgage" onchange="radioChange(jQuery, 'mType')"/>
Remortgage your existing home
</label>
<label for="mTypeFTB" class="radio">
<input type="radio" name="mType" id="mTypeFTB" value="ftb" onchange="radioChange(jQuery, 'mType')"/>
Buy a home for the first time
</label>
<label for="mTypeMove" class="radio">
<input type="radio" name="mType" id="mTypeMove" value="move" onchange="radioChange(jQuery, 'mType')"/>
Move home
</label>
</div>
`,
    `<!-- 1 -->
<div class="intro">How much is your property worth?</div>
<div class="currencyInput">
    <label for="value">&pound;</label>
    <input type="number" id="value" min="5000" max="2500000" value="__propertyValue" onchange="valueChange(jQuery)"/>
</div>
<div class="warning"></div>
`, `<!-- 2 -->
<div class="intro">How much do you wish to borrow?</div>
<div class="currencyInput">
    <label for="value">&pound;</label>
    <input type="number" id="value" min="5000" max="2500000" value="__mortgageAmount" onChange="amountChange(jQuery)"/>
</div>
<div class="warning"></div>
`, `<!-- 3 -->
<div class="intro">How long do you wish to borrow for?</div>
<div class="monthsYears">
    <div class="timeInput">
        <input type="number" id="years" min="2" max="40" value="__years"/>
        <label for="years">Years</label>
    </div>
    <div class="timeInput">
        <input type="number" id="months" min="0" max="12" value="__months"/>
        <label for="months">Months</label>
    </div>
</div>
<div class="warning"></div>
`, `<!-- 4 -->
<div class="intro">Is this property?</div>
<div class="radioGroup">
    <label for="pTypeRes" class="radio">
        <input type="radio" name="pType" id="pTypeRes" value="residential" onChange="radioChange(jQuery, 'pType')"/>
        Residential
    </label>
    <label for="pTypeBTL" class="radio">
        <input type="radio" name="pType" id="pTypeBTL" value="BTL" onChange="radioChange(jQuery, 'pType')"/>
        Buy to let
    </label>
</div>
<div class="warning"></div>
`,
    `<!-- 5 -->
    <div class="results">Hold on whilst we load some mortgages...</div>
    <div class="warning"></div>
    `,
    `<!-- 6 -->
<div class="intro">
    Please enter your contact information and we'll be in touch as soon as possible:
</div>
<div>
    <label for="name">First name</label>
    <input type="text" name="firstname" id="firstname"/>
</div>
<div>
    <label for="name">Last name</label>
    <input type="text" name="lastname" id="lastname"/>
</div>
<div>
    <label for="phone">Your mobile number</label>
    <input type="text" name="phone" id="phone"/>
</div>
<div>
    <label for="email">Your email</label>
    <input type="text" name="email" id="email"/>
</div>
    `, `<!-- 7 -->
<div>Thank you for getting in contact. We'll be in touch as soon as we can.</div>
`

]

window.onload = () => {
    jQuery(display)
}